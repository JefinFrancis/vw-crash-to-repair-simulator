"""
Base service class for VW crash-to-repair simulator.

Provides common service patterns with dependency injection, error handling,
and Brazilian market validation features.
"""

from abc import ABC
from typing import Any, Dict, List, Optional, Type, TypeVar
import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import ValidationError

from ..repositories.base import BaseRepository
from ..utils.exceptions import ValidationException, ServiceException

logger = logging.getLogger(__name__)

ServiceType = TypeVar("ServiceType")
RepositoryType = TypeVar("RepositoryType", bound=BaseRepository)


class BaseService(ABC):
    """
    Base service class providing common business logic patterns.
    
    All VW domain services inherit from this to ensure consistent
    error handling, validation, and Brazilian market compliance.
    """

    def __init__(self, db_session: AsyncSession):
        """
        Initialize service with database session.
        
        Args:
            db_session: Async database session for repository operations
        """
        self.db_session = db_session

    async def validate_input(self, data: Dict[str, Any], required_fields: List[str]) -> None:
        """
        Validate input data for required fields.
        
        Args:
            data: Input data dictionary
            required_fields: List of required field names
            
        Raises:
            ValidationException: If validation fails
        """
        try:
            missing_fields = []
            for field in required_fields:
                if field not in data or data[field] is None:
                    missing_fields.append(field)
            
            if missing_fields:
                raise ValidationException(
                    f"Missing required fields: {', '.join(missing_fields)}"
                )
                
        except Exception as e:
            logger.error(f"Input validation error: {str(e)}")
            raise ValidationException(f"Invalid input data: {str(e)}")

    def validate_cnpj(self, cnpj: str) -> bool:
        """
        Validate Brazilian CNPJ (company registration) format.
        
        Args:
            cnpj: CNPJ string (formatted or unformatted)
            
        Returns:
            True if CNPJ format is valid
        """
        try:
            import re
            
            # Remove formatting
            cnpj_digits = re.sub(r'\D', '', cnpj)
            
            # Basic format validation
            if len(cnpj_digits) != 14:
                return False
            
            # Check for known invalid patterns
            invalid_patterns = [
                '00000000000000', '11111111111111', '22222222222222',
                '33333333333333', '44444444444444', '55555555555555',
                '66666666666666', '77777777777777', '88888888888888',
                '99999999999999'
            ]
            
            return cnpj_digits not in invalid_patterns
            
        except Exception as e:
            logger.error(f"CNPJ validation error: {str(e)}")
            return False

    def validate_cpf(self, cpf: str) -> bool:
        """
        Validate Brazilian CPF (individual registration) format.
        
        Args:
            cpf: CPF string (formatted or unformatted)
            
        Returns:
            True if CPF format is valid
        """
        try:
            import re
            
            # Remove formatting
            cpf_digits = re.sub(r'\D', '', cpf)
            
            # Basic format validation
            if len(cpf_digits) != 11:
                return False
            
            # Check for known invalid patterns
            if cpf_digits == cpf_digits[0] * 11:
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"CPF validation error: {str(e)}")
            return False

    def format_currency_brl(self, amount: float) -> str:
        """
        Format currency amount in Brazilian Reais.
        
        Args:
            amount: Amount in BRL
            
        Returns:
            Formatted currency string
        """
        try:
            return f"R$ {amount:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
            
        except Exception as e:
            logger.error(f"Currency formatting error: {str(e)}")
            return f"R$ {amount}"

    def calculate_haversine_distance(
        self, 
        lat1: float, lon1: float, 
        lat2: float, lon2: float
    ) -> float:
        """
        Calculate distance between two geographic points using Haversine formula.
        
        Args:
            lat1, lon1: First point coordinates
            lat2, lon2: Second point coordinates
            
        Returns:
            Distance in kilometers
        """
        try:
            import math
            
            # Convert to radians
            lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
            
            # Haversine formula
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            
            a = (
                math.sin(dlat / 2) ** 2 + 
                math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
            )
            
            c = 2 * math.asin(math.sqrt(a))
            r = 6371  # Earth's radius in kilometers
            
            return c * r
            
        except Exception as e:
            logger.error(f"Distance calculation error: {str(e)}")
            return 0.0

    async def log_operation(
        self, 
        operation: str, 
        entity_type: str, 
        entity_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log business operation for audit and monitoring.
        
        Args:
            operation: Operation type (create, update, delete, etc.)
            entity_type: Type of entity (vehicle, dealer, part, etc.)
            entity_id: Optional entity identifier
            details: Optional additional details
        """
        try:
            log_data = {
                'operation': operation,
                'entity_type': entity_type,
                'entity_id': entity_id,
                'timestamp': datetime.utcnow().isoformat(),
                'details': details or {}
            }
            
            logger.info(f"Business operation logged", extra=log_data)
            
        except Exception as e:
            logger.error(f"Operation logging error: {str(e)}")

    async def handle_service_error(self, error: Exception, context: str) -> None:
        """
        Handle service layer errors with proper logging and context.
        
        Args:
            error: Exception that occurred
            context: Context description for the error
            
        Raises:
            ServiceException: Wrapped service exception
        """
        try:
            error_msg = f"{context}: {str(error)}"
            logger.error(error_msg, exc_info=True)
            
            if isinstance(error, ValidationError):
                raise ValidationException(f"Validation error in {context}: {str(error)}")
            elif isinstance(error, (ValidationException, ServiceException)):
                # Re-raise our custom exceptions
                raise error
            else:
                # Wrap other exceptions
                raise ServiceException(error_msg)
                
        except Exception:
            # Last resort error handling
            raise ServiceException(f"Service error in {context}")

    def get_brazilian_states(self) -> Dict[str, str]:
        """
        Get Brazilian state codes and names.
        
        Returns:
            Dictionary mapping state codes to names
        """
        return {
            'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas',
            'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal',
            'ES': 'Espírito Santo', 'GO': 'Goiás', 'MA': 'Maranhão',
            'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul', 'MG': 'Minas Gerais',
            'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná', 'PE': 'Pernambuco',
            'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
            'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima',
            'SC': 'Santa Catarina', 'SP': 'São Paulo', 'SE': 'Sergipe',
            'TO': 'Tocantins'
        }

    def validate_brazilian_state(self, state_code: str) -> bool:
        """
        Validate Brazilian state code.
        
        Args:
            state_code: Two-letter state code
            
        Returns:
            True if valid state code
        """
        return state_code.upper() in self.get_brazilian_states()

    async def commit_transaction(self) -> None:
        """
        Commit current database transaction.
        
        Raises:
            ServiceException: If commit fails
        """
        try:
            await self.db_session.commit()
            logger.debug("Database transaction committed successfully")
            
        except Exception as e:
            await self.rollback_transaction()
            await self.handle_service_error(e, "Database commit")

    async def rollback_transaction(self) -> None:
        """
        Rollback current database transaction.
        """
        try:
            await self.db_session.rollback()
            logger.debug("Database transaction rolled back")
            
        except Exception as e:
            logger.error(f"Database rollback error: {str(e)}")

    def get_vw_models_brazil(self) -> List[str]:
        """
        Get VW vehicle models available in Brazilian market.
        
        Returns:
            List of VW model names
        """
        return [
            'Gol', 'Polo', 'Virtus', 'T-Cross', 'Nivus', 'Tiguan',
            'Amarok', 'Jetta', 'Passat', 'Golf', 'Saveiro', 'Fox',
            'Up!', 'Taos', 'Atlas'
        ]

    def validate_vw_model(self, model: str) -> bool:
        """
        Validate if model is a VW vehicle available in Brazil.
        
        Args:
            model: Vehicle model name
            
        Returns:
            True if valid VW model
        """
        return model in self.get_vw_models_brazil()