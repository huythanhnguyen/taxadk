"""
Test API endpoints for HTKK AI Phase 1
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "status" in data
        assert data["status"] == "running"
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
        assert "database" in data
    
    def test_detailed_health_check(self):
        """Test detailed health check endpoint"""
        response = client.get("/api/v1/health/detailed")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "services" in data
        assert "database" in data["services"]


class TestUserEndpoints:
    """Test user management endpoints"""
    
    def test_create_user(self):
        """Test user creation"""
        user_data = {
            "email": "test@example.com",
            "tax_code": "0123456789",
            "business_name": "Test Business"
        }
        response = client.post("/api/v1/users/", json=user_data)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["tax_code"] == user_data["tax_code"]
        assert "id" in data
    
    def test_get_user(self):
        """Test get user by ID"""
        # First create a user
        user_data = {
            "email": "test2@example.com",
            "tax_code": "0123456790",
            "business_name": "Test Business 2"
        }
        create_response = client.post("/api/v1/users/", json=user_data)
        user_id = create_response.json()["id"]
        
        # Then get the user
        response = client.get(f"/api/v1/users/{user_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == user_data["email"]
    
    def test_get_nonexistent_user(self):
        """Test get nonexistent user"""
        response = client.get("/api/v1/users/99999")
        assert response.status_code == 404


class TestFormEndpoints:
    """Test form-related endpoints"""
    
    def test_get_form_templates(self):
        """Test get available form templates"""
        response = client.get("/api/v1/forms/templates")
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert isinstance(data["templates"], list)
    
    def test_get_form_template_by_id(self):
        """Test get specific form template"""
        # First get available templates
        templates_response = client.get("/api/v1/forms/templates")
        templates = templates_response.json()["templates"]
        
        if templates:
            template_id = templates[0]["id"]
            response = client.get(f"/api/v1/forms/templates/{template_id}")
            assert response.status_code == 200
            data = response.json()
            assert "id" in data
            assert "structure" in data
    
    def test_validate_form_data(self):
        """Test form data validation"""
        form_data = {
            "form_type": "01/GTGT",
            "data": {
                "company_name": "Test Company",
                "tax_code": "0123456789",
                "period": "2024-01"
            }
        }
        response = client.post("/api/v1/forms/validate", json=form_data)
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert "errors" in data
    
    def test_export_form_xml(self):
        """Test XML export functionality"""
        form_data = {
            "form_type": "01/GTGT",
            "data": {
                "company_name": "Test Company",
                "tax_code": "0123456789",
                "period": "2024-01",
                "total_revenue": 1000000,
                "vat_amount": 100000
            }
        }
        response = client.post("/api/v1/forms/export/xml", json=form_data)
        assert response.status_code == 200
        # Should return XML content
        assert response.headers["content-type"] == "application/xml"


class TestDocumentEndpoints:
    """Test document processing endpoints"""
    
    def test_upload_document_endpoint_exists(self):
        """Test document upload endpoint exists"""
        # Test with empty file to check endpoint exists
        response = client.post("/api/v1/documents/upload")
        # Should return 422 (validation error) not 404 (not found)
        assert response.status_code in [422, 400]
    
    def test_get_document_cache(self):
        """Test get document cache"""
        response = client.get("/api/v1/documents/cache")
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        assert isinstance(data["documents"], list)
    
    def test_process_document_endpoint_exists(self):
        """Test document processing endpoint exists"""
        response = client.post("/api/v1/documents/process")
        # Should return 422 (validation error) not 404 (not found)
        assert response.status_code in [422, 400]


class TestFormEngine:
    """Test form engine functionality"""
    
    def test_tax_calculation(self):
        """Test tax calculation functionality"""
        calculation_data = {
            "form_type": "01/GTGT",
            "revenue": 1000000,
            "vat_rate": 10
        }
        response = client.post("/api/v1/forms/calculate", json=calculation_data)
        assert response.status_code == 200
        data = response.json()
        assert "calculations" in data
        assert "vat_amount" in data["calculations"]
    
    def test_field_dependencies(self):
        """Test field dependency calculations"""
        dependency_data = {
            "form_type": "01/GTGT",
            "field": "total_vat",
            "dependencies": {
                "revenue": 1000000,
                "vat_rate": 10
            }
        }
        response = client.post("/api/v1/forms/dependencies", json=dependency_data)
        assert response.status_code == 200
        data = response.json()
        assert "calculated_value" in data 