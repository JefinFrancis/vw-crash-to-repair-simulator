"""WhatsApp proxy endpoint to avoid frontend CORS issues."""

import httpx
import structlog
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from ...config import settings

router = APIRouter()
logger = structlog.get_logger(__name__)


class SendWppCollisionRequest(BaseModel):
    phone: str
    repairPrice: str
    dealerName: str
    dealerAddress: str
    dealerPhone: str


@router.post(
    "/send-collision",
    status_code=status.HTTP_200_OK,
    summary="Send collision WhatsApp message",
    description="Proxy to external WhatsApp API to avoid CORS issues",
)
async def send_collision_whatsapp(payload: SendWppCollisionRequest):
    """Forward collision data to the external WhatsApp API."""
    if not settings.WPP_API_KEY:
        logger.error("WPP_API_KEY is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "WhatsApp API key not configured"},
        )

    try:
        logger.info("Sending WhatsApp collision message", phone=payload.phone)
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                settings.WPP_API_URL,
                json=payload.model_dump(),
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": settings.WPP_API_KEY,
                },
            )
            response.raise_for_status()

        logger.info("WhatsApp message sent successfully", phone=payload.phone)
        return {"message": "Mensagem enviada com sucesso"}

    except httpx.HTTPStatusError as e:
        logger.error("WhatsApp API error", status=e.response.status_code, body=e.response.text)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"message": "Erro na API do WhatsApp", "error": e.response.text},
        )
    except Exception as e:
        logger.error("Unexpected error sending WhatsApp", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Erro ao enviar mensagem", "error": str(e)},
        )
