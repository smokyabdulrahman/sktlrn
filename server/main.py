from fastapi import FastAPI
from starlette.endpoints import WebSocketEndpoint
import logfire

from checkboxes import Checkboxes
from config import Configuration
from handler import ClientHandler
from websocket import ConnectionManager


app = FastAPI()
logfire.configure()
logfire.instrument_fastapi(app, capture_headers=True)


@app.get("/")
def read_root():
    return {
        "message": "what are you trying to do boss? please just go and enjoy the game."
    }


config = Configuration()  # type: ignore - not sure why this line is complaining
connection_manager = ConnectionManager()
checkboxes = Checkboxes(config.num_of_checkboxes)
client_handler = ClientHandler(checkboxes, connection_manager)


# TODOs:
# [] pipe all websocket messages from client into redis for better scailing
# [] accumualte messages every 500ms, then broadcast


class CheckboxesWebSocketEndpoint(WebSocketEndpoint):
    encoding = "bytes"

    async def on_connect(self, websocket):
        await connection_manager.connect(websocket)
        logfire.info("connected")
        await client_handler.init_client(websocket)

    async def on_receive(self, websocket, data):
        logfire.info("message received")
        await client_handler.handle(data, websocket)

    async def on_disconnect(self, websocket, close_code):
        logfire.warn("disconnected with code: {close_code}", close_code=close_code)
        connection_manager.disconnect(websocket)


app.add_websocket_route("/ws", CheckboxesWebSocketEndpoint)  # type: ignore - works for starlett
