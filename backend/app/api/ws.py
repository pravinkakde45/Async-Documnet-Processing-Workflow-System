import asyncio
import json
import logging
import redis.asyncio as aioredis
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast JSON payload to all active websocket sessions."""
        bad_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to transmit websocket message, cleaning up session: {str(e)}")
                bad_connections.append(connection)
                
        for conn in bad_connections:
            self.disconnect(conn)

manager = ConnectionManager()

async def redis_pubsub_listener():
    """
    Asynchronous listener that consumes messages from Redis Pub/Sub 
    and broadcasts them to all active client WebSocket connections.
    """
    logger.info("Starting Redis Pub/Sub listener...")
    r = aioredis.from_url(settings.redis_url)
    pubsub = r.pubsub()
    await pubsub.subscribe("job_updates")
    
    try:
        async for message in pubsub.listen():
            if message and message["type"] == "message":
                try:
                    data = json.loads(message["data"].decode("utf-8"))
                    await manager.broadcast(data)
                except Exception as e:
                    logger.error(f"Error parsing Pub/Sub message payload: {str(e)}")
    except asyncio.CancelledError:
        logger.info("Redis Pub/Sub listener task was cancelled")
    except Exception as e:
        logger.error(f"Redis Pub/Sub subscription error: {str(e)}")
        # Simple recovery loop on connection drops
        await asyncio.sleep(5)
        asyncio.create_task(redis_pubsub_listener())
    finally:
        await pubsub.unsubscribe("job_updates")
        await r.close()

@router.websocket("/jobs")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for client connections to receive live processing log streams.
    """
    await manager.connect(websocket)
    try:
        # Loop to handle incoming pings/messages from client to keep connection open
        while True:
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Websocket connection closed with error: {str(e)}")
        manager.disconnect(websocket)
