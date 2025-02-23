from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from starlette.routing import WebSocketRoute
from starlette.endpoints import WebSocketEndpoint

from checkboxes import Checkboxes
from config import Configuration
from handler import ClientHandler
from websocket import ConnectionManager
from logging import getLogger

logger = getLogger(__name__)
app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


config = Configuration()  # type: ignore - not sure why this line is complaining
connection_manager = ConnectionManager()
checkboxes = Checkboxes(config.num_of_checkboxes)
client_handler = ClientHandler(checkboxes, connection_manager)


# TODOs:
# [] pipe all websocket messages from client into redis pubsub queue


class CheckboxesWebSocketEndpoint(WebSocketEndpoint):
    encoding = "bytes"

    async def on_connect(self, websocket):
        await connection_manager.connect(websocket)
        logger.info("connected")
        await client_handler.init_client(websocket)

    async def on_receive(self, websocket, data):
        logger.info("message received")
        await client_handler.handle(data, websocket)

    async def on_disconnect(self, websocket, close_code):
        logger.warn(f"disconnected with code: {close_code}")
        connection_manager.disconnect(websocket)


app.add_websocket_route("/ws", CheckboxesWebSocketEndpoint)  # type: ignore - works for starlett
