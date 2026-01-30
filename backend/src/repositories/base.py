"""
Base repository pattern implementation for VW crash-to-repair simulator.

Provides common database operations with async patterns and Brazilian localization support.
All specific repositories inherit from this base to ensure consistent data access patterns.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type, TypeVar, Generic, Union
from uuid import UUID
import logging

from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy.sql import Select
from pydantic import BaseModel

# Use Any for model type until models are properly defined
from typing import Any
SQLModel = Any

logger = logging.getLogger(__name__)

# Type variables for generic repository operations
ModelType = TypeVar("ModelType", bound=SQLModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType], ABC):
    """
    Base repository class providing common CRUD operations for all models.
    
    Implements async patterns with proper error handling and Brazilian timezone support.
    All VW-specific repositories inherit from this class.
    """

    def __init__(self, model: Type[ModelType], db_session: AsyncSession):
        """
        Initialize the repository with a model and database session.
        
        Args:
            model: SQLAlchemy model class
            db_session: Async database session
        """
        self.model = model
        self.db_session = db_session

    async def get_by_id(
        self, 
        id: UUID, 
        load_relationships: Optional[List[str]] = None
    ) -> Optional[ModelType]:
        """
        Get a single record by ID with optional relationship loading.
        
        Args:
            id: Record UUID
            load_relationships: List of relationship names to eager load
            
        Returns:
            Model instance or None if not found
        """
        try:
            query = select(self.model).where(self.model.id == id)
            
            # Add relationship loading if specified
            if load_relationships:
                for relationship in load_relationships:
                    query = query.options(selectinload(getattr(self.model, relationship)))
            
            result = await self.db_session.execute(query)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Error getting {self.model.__name__} by ID {id}: {str(e)}")
            raise

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        load_relationships: Optional[List[str]] = None
    ) -> List[ModelType]:
        """
        Get multiple records with filtering, pagination, and sorting.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            filters: Dictionary of column filters
            order_by: Column name to order by (default: created_at desc)
            load_relationships: List of relationship names to eager load
            
        Returns:
            List of model instances
        """
        try:
            query = select(self.model)
            
            # Apply filters
            if filters:
                conditions = []
                for column, value in filters.items():
                    if hasattr(self.model, column):
                        if isinstance(value, list):
                            conditions.append(getattr(self.model, column).in_(value))
                        elif isinstance(value, dict) and 'operator' in value:
                            # Advanced filtering: {'operator': 'like', 'value': '%text%'}
                            column_attr = getattr(self.model, column)
                            if value['operator'] == 'like':
                                conditions.append(column_attr.like(value['value']))
                            elif value['operator'] == 'gte':
                                conditions.append(column_attr >= value['value'])
                            elif value['operator'] == 'lte':
                                conditions.append(column_attr <= value['value'])
                        else:
                            conditions.append(getattr(self.model, column) == value)
                
                if conditions:
                    query = query.where(and_(*conditions))
            
            # Add relationship loading
            if load_relationships:
                for relationship in load_relationships:
                    query = query.options(selectinload(getattr(self.model, relationship)))
            
            # Apply ordering
            if order_by:
                if hasattr(self.model, order_by):
                    query = query.order_by(getattr(self.model, order_by).desc())
            elif hasattr(self.model, 'created_at'):
                query = query.order_by(self.model.created_at.desc())
            
            # Apply pagination
            query = query.offset(skip).limit(limit)
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting multiple {self.model.__name__} records: {str(e)}")
            raise

    async def create(self, obj_in: CreateSchemaType) -> ModelType:
        """
        Create a new record.
        
        Args:
            obj_in: Pydantic schema with creation data
            
        Returns:
            Created model instance
        """
        try:
            # Convert Pydantic schema to dict, excluding unset fields
            obj_data = obj_in.model_dump(exclude_unset=True)
            
            # Create new model instance
            db_obj = self.model(**obj_data)
            
            # Add to session and flush to get the ID
            self.db_session.add(db_obj)
            await self.db_session.flush()
            await self.db_session.refresh(db_obj)
            
            logger.info(f"Created {self.model.__name__} with ID: {db_obj.id}")
            return db_obj
            
        except Exception as e:
            logger.error(f"Error creating {self.model.__name__}: {str(e)}")
            await self.db_session.rollback()
            raise

    async def update(
        self, 
        id: UUID, 
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> Optional[ModelType]:
        """
        Update an existing record.
        
        Args:
            id: Record UUID
            obj_in: Pydantic schema or dict with update data
            
        Returns:
            Updated model instance or None if not found
        """
        try:
            # Get existing record
            db_obj = await self.get_by_id(id)
            if not db_obj:
                return None
            
            # Convert update data to dict
            if isinstance(obj_in, dict):
                update_data = obj_in
            else:
                update_data = obj_in.model_dump(exclude_unset=True)
            
            # Update fields
            for field, value in update_data.items():
                if hasattr(db_obj, field):
                    setattr(db_obj, field, value)
            
            # Flush to database
            await self.db_session.flush()
            await self.db_session.refresh(db_obj)
            
            logger.info(f"Updated {self.model.__name__} with ID: {id}")
            return db_obj
            
        except Exception as e:
            logger.error(f"Error updating {self.model.__name__} {id}: {str(e)}")
            await self.db_session.rollback()
            raise

    async def delete(self, id: UUID) -> bool:
        """
        Delete a record by ID.
        
        Args:
            id: Record UUID
            
        Returns:
            True if deleted, False if not found
        """
        try:
            # Check if record exists
            db_obj = await self.get_by_id(id)
            if not db_obj:
                return False
            
            # Delete the record
            await self.db_session.delete(db_obj)
            await self.db_session.flush()
            
            logger.info(f"Deleted {self.model.__name__} with ID: {id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting {self.model.__name__} {id}: {str(e)}")
            await self.db_session.rollback()
            raise

    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Count records with optional filtering.
        
        Args:
            filters: Dictionary of column filters
            
        Returns:
            Total count of matching records
        """
        try:
            from sqlalchemy import func
            
            query = select(func.count(self.model.id))
            
            # Apply filters
            if filters:
                conditions = []
                for column, value in filters.items():
                    if hasattr(self.model, column):
                        if isinstance(value, list):
                            conditions.append(getattr(self.model, column).in_(value))
                        else:
                            conditions.append(getattr(self.model, column) == value)
                
                if conditions:
                    query = query.where(and_(*conditions))
            
            result = await self.db_session.execute(query)
            return result.scalar() or 0
            
        except Exception as e:
            logger.error(f"Error counting {self.model.__name__} records: {str(e)}")
            raise

    async def exists(self, id: UUID) -> bool:
        """
        Check if a record exists by ID.
        
        Args:
            id: Record UUID
            
        Returns:
            True if exists, False otherwise
        """
        try:
            from sqlalchemy import func
            
            query = select(func.count(self.model.id)).where(self.model.id == id)
            result = await self.db_session.execute(query)
            count = result.scalar() or 0
            
            return count > 0
            
        except Exception as e:
            logger.error(f"Error checking existence of {self.model.__name__} {id}: {str(e)}")
            raise

    @abstractmethod
    async def get_by_unique_field(self, field_name: str, field_value: Any) -> Optional[ModelType]:
        """
        Get a record by a unique field (e.g., VIN, CNPJ).
        
        Must be implemented by specific repositories based on their unique constraints.
        """
        pass

    async def bulk_create(self, objs_in: List[CreateSchemaType]) -> List[ModelType]:
        """
        Create multiple records in a single transaction.
        
        Args:
            objs_in: List of Pydantic schemas with creation data
            
        Returns:
            List of created model instances
        """
        try:
            db_objs = []
            
            for obj_in in objs_in:
                obj_data = obj_in.model_dump(exclude_unset=True)
                db_obj = self.model(**obj_data)
                db_objs.append(db_obj)
            
            # Add all objects to session
            self.db_session.add_all(db_objs)
            await self.db_session.flush()
            
            # Refresh all objects to get their IDs
            for db_obj in db_objs:
                await self.db_session.refresh(db_obj)
            
            logger.info(f"Bulk created {len(db_objs)} {self.model.__name__} records")
            return db_objs
            
        except Exception as e:
            logger.error(f"Error bulk creating {self.model.__name__} records: {str(e)}")
            await self.db_session.rollback()
            raise

    async def search(
        self,
        search_term: str,
        search_fields: List[str],
        skip: int = 0,
        limit: int = 100
    ) -> List[ModelType]:
        """
        Full-text search across specified fields.
        
        Args:
            search_term: Text to search for
            search_fields: List of field names to search in
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of matching model instances
        """
        try:
            query = select(self.model)
            
            # Build search conditions
            search_conditions = []
            search_pattern = f"%{search_term}%"
            
            for field_name in search_fields:
                if hasattr(self.model, field_name):
                    field = getattr(self.model, field_name)
                    search_conditions.append(field.like(search_pattern))
            
            if search_conditions:
                query = query.where(or_(*search_conditions))
            
            # Apply pagination
            query = query.offset(skip).limit(limit)
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error searching {self.model.__name__} records: {str(e)}")
            raise