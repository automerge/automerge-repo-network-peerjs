import { EventEmitter } from "eventemitter3";

import type * as t from "./types.ts";

type EventTypes = { data: t.NetworkMessageAlert };

/**
 * An Automerge repo network-adapter for WebRTC (P2P)
 *
 * Based on:
 *    MessageChannelNetworkAdapter (point-to-point)
 *    https://github.com/automerge/automerge-repo/blob/main/packages/automerge-repo-network-messagechannel/src/index.ts
 *
 */
export class PeerjsNetworkAdapter
  extends EventEmitter<t.NetworkAdapterEvents>
  implements t.NetworkAdapterInterface
{
  peerId?: t.PeerId;
  peerMetadata?: t.PeerMetadata;

  #conn: t.DataConnection;
  #events = new EventEmitter<EventTypes>();

  #ready = false;
  #readyResolver?: () => void;
  #readyPromise: Promise<void> = new Promise<void>((resolve) => (this.#readyResolver = resolve));
  #forceReady() {
    if (this.#ready) return;
    this.#ready = true;
    this.#readyResolver?.();
  }

  constructor(conn: t.DataConnection) {
    if (!conn) throw new Error(`A peerjs data-connection is required`);
    super();
    this.#conn = conn;
  }

  isReady() {
    return this.#ready;
  }

  whenReady() {
    return this.#readyPromise;
  }

  connect(peerId: t.PeerId, meta?: t.PeerMetadata) {
    const senderId = (this.peerId = peerId);
    const conn = this.#conn;
    const peerMetadata = meta ?? {};

    const handleOpen = () => this.#transmit({ type: "arrive", senderId, peerMetadata });
    const handleClose = () => this.emit("close");
    const handleData = (e: any) => {
      const msg = e as t.NetworkMessage;

      /**
       * Arrive.
       */
      if (msg.type === "arrive") {
        const { peerMetadata } = msg as t.ArriveMessage;
        const targetId = msg.senderId;
        this.#transmit({ type: "welcome", senderId, targetId, peerMetadata });
        this.#announceConnection(targetId, peerMetadata);
        return;
      }

      /**
       * Welcome.
       */
      if (msg.type === "welcome") {
        const { peerMetadata } = msg as t.WelcomeMessage;
        this.#announceConnection(msg.senderId, peerMetadata);
        return;
      }

      /**
       * Default (data payload).
       */
      let payload = msg as t.Message;
      if ("data" in msg) payload = { ...payload, data: toUint8Array(msg.data!) };
      this.emit("message", payload);
      this.#alert("incoming", msg);
    };

    conn.on("open", handleOpen);
    conn.on("close", handleClose);
    conn.on("data", handleData);

    // FIX: If the connection is already open, trigger handleOpen manually
    if (conn.open) {
      handleOpen();
    }

    this.on("peer-disconnected", () => {
      this.#ready = false;
      conn.off("open", handleOpen);
      conn.off("close", handleClose);
      conn.off("data", handleData);
    });

    setTimeout(() => this.#ready = true, 100);
  }

  disconnect() {
    const peerId = this.peerId;
    if (peerId) this.emit("peer-disconnected", { peerId });
  }

  onData(fn: (e: t.NetworkMessageAlert) => void) {
    this.#events.on("data", fn);
    return () => this.#events.off("data", fn);
  }

  send(message: t.RepoMessage) {
    if (!this.#conn) throw new Error("Connection not ready");
    if ("data" in message) {
      this.#transmit({ ...message, data: toUint8Array(message.data) });
    } else {
      this.#transmit(message);
    }
  }

  #transmit(message: t.NetworkMessage) {
    if (!this.#conn) throw new Error("Connection not ready");
    this.#conn.send(message);
    this.#alert("outgoing", message);
  }

  #alert(direction: t.IODirection, message: t.NetworkMessage) {
    const bytes = "data" in message ? message.data?.byteLength ?? 0 : 0;
    const payload: t.NetworkMessageAlert = { direction, message, bytes };
    this.#events.emit("data", payload);
  }

  #announceConnection(peerId: t.PeerId, peerMetadata: t.PeerMetadata) {
    this.#forceReady();
    this.emit("peer-candidate", { peerId, peerMetadata });
  }
}

/**
 * Helpers
 */
function toUint8Array(input: Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}