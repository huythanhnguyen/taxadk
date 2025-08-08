"""
Test database models and connections for HTKK AI Phase 1
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.models import Base, User, ADKSession, DocumentCache, AuditLog
from app.database.connection import get_database_url, test_connection


@pytest.fixture
def test_engine():
    """Create test database engine"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def test_session(test_engine):
    """Create test database session"""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


class TestDatabaseModels:
    """Test database models"""
    
    def test_user_model(self, test_session):
        """Test User model creation and relationships"""
        user = User(
            email="test@example.com",
            tax_code="0123456789",
            business_name="Test Business"
        )
        test_session.add(user)
        test_session.commit()
        
        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.tax_code == "0123456789"
        assert user.business_name == "Test Business"
        assert user.created_at is not None
    
    def test_adk_session_model(self, test_session):
        """Test ADKSession model"""
        user = User(email="test@example.com")
        test_session.add(user)
        test_session.commit()
        
        session = ADKSession(
            user_id=user.id,
            session_id="test-session-123",
            session_data={"state": "active", "memory": {}}
        )
        test_session.add(session)
        test_session.commit()
        
        assert session.id is not None
        assert session.user_id == user.id
        assert session.session_id == "test-session-123"
        assert session.session_data["state"] == "active"
        assert session.user.email == "test@example.com"
    
    def test_document_cache_model(self, test_session):
        """Test DocumentCache model"""
        user = User(email="test@example.com")
        test_session.add(user)
        test_session.commit()
        
        doc = DocumentCache(
            user_id=user.id,
            file_hash="abc123def456",
            extracted_data={"invoice_number": "INV-001", "amount": 1000000},
            file_type="pdf"
        )
        test_session.add(doc)
        test_session.commit()
        
        assert doc.id is not None
        assert doc.file_hash == "abc123def456"
        assert doc.file_type == "pdf"
        assert doc.extracted_data["invoice_number"] == "INV-001"
    
    def test_audit_log_model(self, test_session):
        """Test AuditLog model"""
        user = User(email="test@example.com")
        test_session.add(user)
        test_session.commit()
        
        log = AuditLog(
            user_id=user.id,
            action="form_submit",
            details={"form_type": "01/GTGT", "status": "success"}
        )
        test_session.add(log)
        test_session.commit()
        
        assert log.id is not None
        assert log.action == "form_submit"
        assert log.details["form_type"] == "01/GTGT"


class TestDatabaseConnection:
    """Test database connection functionality"""
    
    def test_database_url_generation(self):
        """Test database URL generation"""
        url = get_database_url()
        assert url is not None
        assert isinstance(url, str)
    
    def test_connection_test(self):
        """Test database connection test function"""
        # This will test against the actual configured database
        result = test_connection()
        assert isinstance(result, bool) 