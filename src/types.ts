/**
 * @automerge
 */
import type { Message, PeerId, RepoMessage, StorageId } from "@automerge/automerge-repo";
export { Message, PeerId, RepoMessage };

/**
 * @peerjs
 */
export type { DataConnection } from "peerjs";

/**
 * @internal
 * Based on:
 *    MessageChannelNetworkAdapter
 *    https://github.com/automerge/automerge-repo/blob/main/packages/automerge-repo-network-messagechannel/src/index.ts
 */
export type { PeerjsNetworkAdapter } from "./NetworkAdapter.js";

export type IODirection = "incoming" | "outgoing";
export type NetworkMessage = ArriveMessage | WelcomeMessage | Message;
export type NetworkMessageAlert = {
  direction: IODirection;
  message: NetworkMessage;
};

/**
 * Describes a peer intent to the system
 * storageId: the key for syncState to decide what the other peer already has
 * isEphemeral: to decide if we bother recording this peer's sync state
 */
export interface PeerMetadata {
  storageId?: StorageId;
  isEphemeral?: boolean;
}

/**
 * Notify the network that we have arrived so everyone knows our peer ID
 */
export type ArriveMessage = {
  type: "arrive";

  /** The peer ID of the sender of this message */
  senderId: PeerId;

  /** Arrive messages don't have a targetId */
  targetId?: never;

  /** The peer metadata of the sender of this message */
  peerMetadata: PeerMetadata;
};

/**
 * Respond to an arriving peer with our peer ID
 */
export type WelcomeMessage = {
  type: "welcome";

  /** The peer ID of the recipient sender this message */
  senderId: PeerId;

  /** The peer ID of the recipient of this message */
  targetId: PeerId;

  /** The peer metadata of the sender of this message */
  peerMetadata: PeerMetadata;
};
