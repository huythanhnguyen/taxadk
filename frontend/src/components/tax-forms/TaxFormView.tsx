import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Save, 
  Download, 
  Upload, 
  Calculator,
  Building2,
  User,
  Calendar,
  DollarSign,
  Percent,
  Plus,
  Minus,
  Eye
} from 'lucide-react';
import { TaxForm } from '@/types/tax-forms';

interface TaxFormViewProps {
  currentForm: TaxForm | null;
  onFormSelect: (formType: string) => void;
  onFormSave: (form: TaxForm) => void;
}

export function TaxFormView({ currentForm, onFormSelect, onFormSave }: TaxFormViewProps) {
  const [formData, setFormData] = useState<Record<string, any>>(currentForm?.data || {});
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const taxForms = [
    {
      code: "01/GTGT",
      title: "Tờ khai thuế GTGT",
      description: "Tờ khai thuế giá trị gia tăng",
      icon: FileText,
      color: "text-blue-500"
    },
    {
      code: "03/TNDN",
      title: "Tờ khai thuế TNDN",
      description: "Tờ khai thuế thu nhập doanh nghiệp",
      icon: Building2,
      color: "text-green-500"
    },
    {
      code: "02/TNCN",
      title: "Tờ khai thuế TNCN",
      description: "Tờ khai thuế thu nhập cá nhân",
      icon: User,
      color: "text-purple-500"
    }
  ];

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSave = () => {
    if (currentForm) {
      const updatedForm: TaxForm = {
        ...currentForm,
        data: formData,
        updatedAt: new Date().toISOString(),
        status: 'draft'
      };
      onFormSave(updatedForm);
    }
  };

  const handleExport = () => {
    // TODO: Implement XML export functionality
    console.log('Exporting form data:', formData);
  };

  const renderVATForm = () => (
    <div className="space-y-6">
      {/* Thông tin doanh nghiệp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Thông tin doanh nghiệp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name">Tên doanh nghiệp</Label>
              <Input
                id="company_name"
                value={formData.company_name || ''}
                onChange={(e) => handleFieldChange('company_name', e.target.value)}
                placeholder="Nhập tên doanh nghiệp"
              />
            </div>
            <div>
              <Label htmlFor="tax_code">Mã số thuế</Label>
              <Input
                id="tax_code"
                value={formData.tax_code || ''}
                onChange={(e) => handleFieldChange('tax_code', e.target.value)}
                placeholder="0123456789"
              />
            </div>
            <div>
              <Label htmlFor="address">Địa chỉ</Label>
              <Input
                id="address"
                value={formData.address || ''}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                placeholder="Nhập địa chỉ"
              />
            </div>
            <div>
              <Label htmlFor="period">Kỳ tính thuế</Label>
              <Input
                id="period"
                type="month"
                value={formData.period || ''}
                onChange={(e) => handleFieldChange('period', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Doanh thu và thuế */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Doanh thu và thuế GTGT
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="revenue_0">Doanh thu 0%</Label>
              <Input
                id="revenue_0"
                type="number"
                value={formData.revenue_0 || ''}
                onChange={(e) => handleFieldChange('revenue_0', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="revenue_5">Doanh thu 5%</Label>
              <Input
                id="revenue_5"
                type="number"
                value={formData.revenue_5 || ''}
                onChange={(e) => handleFieldChange('revenue_5', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="revenue_10">Doanh thu 10%</Label>
              <Input
                id="revenue_10"
                type="number"
                value={formData.revenue_10 || ''}
                onChange={(e) => handleFieldChange('revenue_10', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="vat_output_5">Thuế GTGT đầu ra 5%</Label>
              <Input
                id="vat_output_5"
                type="number"
                value={formData.vat_output_5 || (formData.revenue_5 * 0.05) || ''}
                onChange={(e) => handleFieldChange('vat_output_5', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="vat_output_10">Thuế GTGT đầu ra 10%</Label>
              <Input
                id="vat_output_10"
                type="number"
                value={formData.vat_output_10 || (formData.revenue_10 * 0.1) || ''}
                onChange={(e) => handleFieldChange('vat_output_10', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="vat_input">Thuế GTGT đầu vào</Label>
              <Input
                id="vat_input"
                type="number"
                value={formData.vat_input || ''}
                onChange={(e) => handleFieldChange('vat_input', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Tổng thuế GTGT phải nộp:</span>
              <span className="text-lg font-bold text-primary">
                {((formData.vat_output_5 || 0) + (formData.vat_output_10 || 0) - (formData.vat_input || 0)).toLocaleString('vi-VN')} VNĐ
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCorporateTaxForm = () => (
    <div className="space-y-6">
      {/* Thông tin doanh nghiệp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Thông tin doanh nghiệp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name">Tên doanh nghiệp</Label>
              <Input
                id="company_name"
                value={formData.company_name || ''}
                onChange={(e) => handleFieldChange('company_name', e.target.value)}
                placeholder="Nhập tên doanh nghiệp"
              />
            </div>
            <div>
              <Label htmlFor="tax_code">Mã số thuế</Label>
              <Input
                id="tax_code"
                value={formData.tax_code || ''}
                onChange={(e) => handleFieldChange('tax_code', e.target.value)}
                placeholder="0123456789"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Thu nhập và thuế */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Thu nhập và thuế TNDN
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_revenue">Tổng doanh thu</Label>
              <Input
                id="total_revenue"
                type="number"
                value={formData.total_revenue || ''}
                onChange={(e) => handleFieldChange('total_revenue', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="total_expenses">Tổng chi phí</Label>
              <Input
                id="total_expenses"
                type="number"
                value={formData.total_expenses || ''}
                onChange={(e) => handleFieldChange('total_expenses', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="taxable_income">Thu nhập chịu thuế</Label>
              <Input
                id="taxable_income"
                type="number"
                value={formData.taxable_income || ((formData.total_revenue || 0) - (formData.total_expenses || 0)) || ''}
                onChange={(e) => handleFieldChange('taxable_income', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="tax_rate">Thuế suất (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                value={formData.tax_rate || 20}
                onChange={(e) => handleFieldChange('tax_rate', parseFloat(e.target.value) || 20)}
                placeholder="20"
              />
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Thuế TNDN phải nộp:</span>
              <span className="text-lg font-bold text-primary">
                {((formData.taxable_income || 0) * (formData.tax_rate || 20) / 100).toLocaleString('vi-VN')} VNĐ
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPersonalTaxForm = () => (
    <div className="space-y-6">
      {/* Thông tin cá nhân */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Thông tin cá nhân
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Họ và tên</Label>
              <Input
                id="full_name"
                value={formData.full_name || ''}
                onChange={(e) => handleFieldChange('full_name', e.target.value)}
                placeholder="Nhập họ và tên"
              />
            </div>
            <div>
              <Label htmlFor="tax_code">Mã số thuế</Label>
              <Input
                id="tax_code"
                value={formData.tax_code || ''}
                onChange={(e) => handleFieldChange('tax_code', e.target.value)}
                placeholder="0123456789"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Thu nhập và thuế */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Thu nhập và thuế TNCN
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gross_income">Thu nhập tổng</Label>
              <Input
                id="gross_income"
                type="number"
                value={formData.gross_income || ''}
                onChange={(e) => handleFieldChange('gross_income', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="deductions">Các khoản giảm trừ</Label>
              <Input
                id="deductions"
                type="number"
                value={formData.deductions || 11000000}
                onChange={(e) => handleFieldChange('deductions', parseFloat(e.target.value) || 0)}
                placeholder="11000000"
              />
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Thuế TNCN phải nộp:</span>
              <span className="text-lg font-bold text-primary">
                {Math.max(0, ((formData.gross_income || 0) - (formData.deductions || 0)) * 0.1).toLocaleString('vi-VN')} VNĐ
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderFormContent = () => {
    if (!currentForm) return null;

    switch (currentForm.formCode) {
      case '01/GTGT':
        return renderVATForm();
      case '03/TNDN':
        return renderCorporateTaxForm();
      case '02/TNCN':
        return renderPersonalTaxForm();
      default:
        return (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Form chưa được hỗ trợ</h3>
              <p className="text-muted-foreground">
                Form {currentForm.formCode} đang được phát triển
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  if (!currentForm) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Tờ khai thuế</h1>
            <p className="text-muted-foreground">Chọn loại tờ khai thuế để bắt đầu</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {taxForms.map((form) => (
              <Card 
                key={form.code}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                onClick={() => onFormSelect(form.code)}
              >
                <CardContent className="p-6 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-primary/10">
                      <form.icon className={`w-8 h-8 ${form.color}`} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{form.code}</h3>
                    <p className="font-medium text-sm">{form.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{form.description}</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Tạo tờ khai
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{currentForm.title}</h1>
            <p className="text-muted-foreground">Mã tờ khai: {currentForm.formCode}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {isPreviewMode ? 'Chỉnh sửa' : 'Xem trước'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
            >
              <Save className="w-4 h-4 mr-2" />
              Lưu
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2" />
              Xuất XML
            </Button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-6xl mx-auto p-6">
          {renderFormContent()}
        </div>
      </ScrollArea>
    </div>
  );
}
