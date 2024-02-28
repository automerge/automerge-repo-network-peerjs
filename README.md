# automerge-repo-network-peerjs
[![ci.node](https://github.com/philcockfield/automerge-repo-network-peerjs/actions/workflows/ci.node.yml/badge.svg)](https://github.com/philcockfield/automerge-repo-network-peerjs/actions/workflows/ci.node.yml) 

A network adapter for WebRTC using [peerjs](https://github.com/peers/peerjs), based on the point-to-point [MessageChannelNetworkAdapter](https://github.com/automerge/automerge-repo/blob/main/packages/automerge-repo-network-messagechannel/src/index.ts).


<p>&nbsp;</p>


## Setup
```
yarn add automerge-repo-network-peerjs
```

<p>&nbsp;</p>

## Usage

Establish a data connection as per [peerjs](https://github.com/peers/peerjs#data-connections) documentation:

```ts
import { Peer } from "peerjs";
const conn = peer.connect("another-peers-id");
```

Then use that to pass into the constructor of the automerge network adapter:

```ts
import { PeerjsNetworkAdapter } from 'automerge-repo-network-peerjs';
const adapter = new PeerjsNetworkAdapter(conn);
```

Along with the usual `NetworkAdapterInterface` events an additional `onData` event is available to 
to keep track of directional data being sent and received, for example:

```ts
function monitor(adapter: PeerjsNetworkAdapter, dispose$?: Observable<any>) {
  const detach = adapter.onData((e) => console.log(`⚡️ ${e.direction}: ${e.bytes} bytes`));
  dispose$?.subscribe(() => detach());
}

```

<p>&nbsp;</p>


## Licence
MIT

<p>&nbsp;</p>

---
**Please Note:**  
This is not an official part of the [automerge-repo](https://github.com/automerge/automerge-repo) project, rather a community contribution that includes a dependency on the [peerjs](https://github.com/peers/peerjs) library.
