#!/usr/bin/env python3
"""Small TCP proxy for routing VDA through localhost.

Example:
    tools/vda_tcp_proxy.py --remote-host 192.168.1.100

Then connect VDA to the local side:
    vega exec vda connect 127.0.0.1:15555
"""

import argparse
import socket
import threading
from typing import Tuple


Address = Tuple[str, int]


def pump(source: socket.socket, destination: socket.socket) -> None:
    try:
        while True:
            data = source.recv(65536)
            if not data:
                break
            destination.sendall(data)
    except OSError:
        pass
    finally:
        for sock in (source, destination):
            try:
                sock.close()
            except OSError:
                pass


def handle_client(client: socket.socket, remote: Address) -> None:
    try:
        upstream = socket.create_connection(remote, timeout=5)
    except OSError as error:
        print(f"remote connect failed: {error}", flush=True)
        client.close()
        return

    threading.Thread(target=pump, args=(client, upstream), daemon=True).start()
    threading.Thread(target=pump, args=(upstream, client), daemon=True).start()


def serve(local: Address, remote: Address) -> None:
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    listener.bind(local)
    listener.listen(8)

    print(
        f"proxy {local[0]}:{local[1]} -> {remote[0]}:{remote[1]}",
        flush=True,
    )

    try:
        while True:
            client, _ = listener.accept()
            threading.Thread(
                target=handle_client,
                args=(client, remote),
                daemon=True,
            ).start()
    except KeyboardInterrupt:
        print("\nstopping proxy", flush=True)
    finally:
        listener.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Proxy a local TCP port to a Fire TV VDA TCP/IP endpoint.",
    )
    parser.add_argument("--local-host", default="127.0.0.1")
    parser.add_argument("--local-port", default=15555, type=int)
    parser.add_argument("--remote-host", default="192.168.1.100")
    parser.add_argument("--remote-port", default=5555, type=int)
    args = parser.parse_args()

    serve(
        (args.local_host, args.local_port),
        (args.remote_host, args.remote_port),
    )


if __name__ == "__main__":
    main()
