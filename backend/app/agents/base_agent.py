"""
Base Agent Class for Google ADK Multi-Agent System
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """
    Base class for all agents in the HTKK AI Multi-Agent system
    """
    
    def __init__(self, agent_id: str, name: str, description: str):
        self.agent_id = agent_id
        self.name = name
        self.description = description
        self.created_at = datetime.now()
        self.session_data = {}
        self.memory = {}
        
    @abstractmethod
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process input data and return results
        """
        pass
    
    @abstractmethod
    async def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """
        Validate input data before processing
        """
        pass
    
    def update_memory(self, key: str, value: Any) -> None:
        """
        Update agent memory
        """
        self.memory[key] = value
        logger.debug(f"Agent {self.agent_id} memory updated: {key}")
    
    def get_memory(self, key: str) -> Optional[Any]:
        """
        Get value from agent memory
        """
        return self.memory.get(key)
    
    def clear_memory(self) -> None:
        """
        Clear agent memory
        """
        self.memory.clear()
        logger.info(f"Agent {self.agent_id} memory cleared")
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get agent status information
        """
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "memory_size": len(self.memory),
            "session_data_size": len(self.session_data)
        }
    
    async def initialize(self) -> None:
        """
        Initialize agent (override if needed)
        """
        logger.info(f"Agent {self.agent_id} initialized")
    
    async def cleanup(self) -> None:
        """
        Cleanup agent resources (override if needed)
        """
        self.clear_memory()
        self.session_data.clear()
        logger.info(f"Agent {self.agent_id} cleaned up") 