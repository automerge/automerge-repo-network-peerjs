import { NetworkAdapter } from "@automerge/automerge-repo";
import type * as t from "./t.js";

/**
 * An Automerge repo network-adapter for WebRTC (P2P)
 *
 * Based on:
 *    MessageChannelNetworkAdapter (point-to-point)
 *    https://github.com/automerge/automerge-repo/blob/main/packages/automerge-repo-network-messagechannel/src/index.ts
 *
 */
export class WebrtcNetworkAdapter extends NetworkAdapter {
  #conn: t.DataConnection;
  #isReady = false;
  #disconnected$ = rx.subject<void>();
  #message$ = rx.subject<t.WebrtcMessageAlert>();

  readonly message$: t.Observable<t.WebrtcMessageAlert>;

  constructor(conn: t.DataConnection) {
    if (!conn) throw new Error(`A peerjs data-connection is required`);
    super();
    this.#conn = conn;
    this.message$ = this.#message$.pipe(
      rx.takeUntil(this.#disconnected$),
      rx.filter(() => this.#isReady),
    );
  }

  connect(peerId: t.PeerId) {
    const senderId = (this.peerId = peerId);
    const conn = this.#conn;

    const handleOpen = () => this.#transmit({ type: "arrive", senderId, peerMetadata: {} });
    const handleClose = () => this.emit("close");
    const handleData = (e: any) => {
      const msg = e as t.WebrtcMessage;

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
    this.#disconnected$.subscribe(() => {
      this.#isReady = false;
      conn.off("open", handleOpen);
      conn.off("close", handleClose);
      conn.off("data", handleData);
    });

    /**
     * Mark this channel as ready after 100ms, at this point there
     * must be something weird going on at the other end to cause us
     * to receive no response.
     */
    setTimeout(() => this.#setAsReady(), 100);
  }

  disconnect() {
    this.#disconnected$.next();
  }

  send(message: t.RepoMessage) {
    if (!this.#conn) throw new Error("Connection not ready");
    if ("data" in message) {
      this.#transmit({ ...message, data: toUint8Array(message.data) });
    } else {
      this.#transmit(message);
    }
  }

  #transmit(message: t.WebrtcMessage) {
    if (!this.#conn) throw new Error("Connection not ready");
    this.#conn.send(message);
    this.#alert("outgoing", message);
  }

  #alert(direction: t.IODirection, message: t.WebrtcMessage) {
    this.#message$.next({ direction, message });
  }

  #setAsReady() {
    if (this.#isReady) return;
    this.#isReady = true;
    this.emit("ready", { network: this });
  }

  #announceConnection(peerId: t.PeerId, peerMetadata: t.PeerMetadata) {
    this.#setAsReady();
    this.emit("peer-candidate", { peerId, peerMetadata });
  }
}

/**
 * Helpers
 */
function toUint8Array(input: Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}
