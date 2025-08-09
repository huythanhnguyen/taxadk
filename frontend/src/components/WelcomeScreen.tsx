import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calculator, 
  FileText, 
  Upload, 
  MessageSquare, 
  Bot,
  Sparkles,
  FileSpreadsheet,
  Receipt,
  Building2
} from 'lucide-react';

interface WelcomeScreenProps {
  handleSubmit: (query: string, imageFile?: File | null, audioFile?: File | null) => void;
  isLoading: boolean;
  onCancel: () => void;
  onTaxFormSelect: (formType: string) => void;
}

export function WelcomeScreen({ handleSubmit, isLoading, onTaxFormSelect }: WelcomeScreenProps) {
  const [query, setQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleQuickSubmit = (quickQuery: string) => {
    handleSubmit(quickQuery);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() || selectedFile) {
      handleSubmit(query, selectedFile);
      setQuery("");
      setSelectedFile(null);
    }
  };

  const quickActions = [
    {
      title: "Hướng dẫn kê khai thuế",
      description: "Tôi cần hướng dẫn cách kê khai thuế VAT",
      icon: FileText,
      query: "Hướng dẫn tôi cách kê khai thuế VAT cho doanh nghiệp"
    },
    {
      title: "Tính toán thuế",
      description: "Giúp tôi tính thuế thu nhập doanh nghiệp",
      icon: Calculator,
      query: "Tính thuế thu nhập doanh nghiệp cho tôi với doanh thu 1 tỷ đồng"
    },
    {
      title: "Xử lý hóa đơn",
      description: "Trích xuất dữ liệu từ hóa đơn PDF/XML",
      icon: Receipt,
      query: "Giúp tôi xử lý và trích xuất dữ liệu từ hóa đơn điện tử"
    },
    {
      title: "Kiểm tra tuân thủ",
      description: "Kiểm tra tính hợp lệ của tờ khai thuế",
      icon: Building2,
      query: "Kiểm tra tờ khai thuế của tôi có tuân thủ quy định không"
    }
  ];

  const taxForms = [
    {
      code: "01/GTGT",
      title: "Tờ khai thuế GTGT",
      description: "Tờ khai thuế giá trị gia tăng",
      icon: FileSpreadsheet
    },
    {
      code: "03/TNDN",
      title: "Tờ khai thuế TNDN",
      description: "Tờ khai thuế thu nhập doanh nghiệp",
      icon: Building2
    },
    {
      code: "02/TNCN",
      title: "Tờ khai thuế TNCN",
      description: "Tờ khai thuế thu nhập cá nhân",
      icon: FileText
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
              <Calculator className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              HTKK AI
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Hệ thống kê khai thuế thông minh với AI - Tự động hóa quy trình thuế của bạn
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span>Được hỗ trợ bởi Google ADK Multi-Agent AI</span>
          </div>
        </div>

        {/* Quick Chat Input */}
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Chat với AI Assistant
            </CardTitle>
            <CardDescription>
              Đặt câu hỏi về thuế, tải lên tài liệu hoặc yêu cầu hỗ trợ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Ví dụ: Hướng dẫn tôi cách kê khai thuế VAT cho doanh nghiệp..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-[100px] resize-none"
                  disabled={isLoading}
                />
                
                {/* File Upload */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept=".pdf,.xml,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      disabled={isLoading}
                    />
                  </div>
                  {selectedFile && (
                    <div className="text-sm text-muted-foreground">
                      📎 {selectedFile.name}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isLoading || (!query.trim() && !selectedFile)}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 mr-2" />
                      Gửi tin nhắn
                    </>
                  )}
                </Button>
                {(query.trim() || selectedFile) && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setQuery("");
                      setSelectedFile(null);
                    }}
                    disabled={isLoading}
                  >
                    Xóa
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-center">Hành động nhanh</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-border/50 hover:border-primary/50"
                onClick={() => handleQuickSubmit(action.query)}
              >
                <CardContent className="p-4 text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="p-3 rounded-full bg-primary/10">
                      <action.icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{action.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Tax Forms */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-center">Tờ khai thuế</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {taxForms.map((form, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-border/50 hover:border-primary/50"
                onClick={() => onTaxFormSelect(form.code)}
              >
                <CardContent className="p-6 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-primary/10">
                      <form.icon className="w-8 h-8 text-primary" />
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

        {/* Features */}
        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">Tính năng nổi bật</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="text-center space-y-2">
                <Bot className="w-8 h-8 text-primary mx-auto" />
                <h4 className="font-medium">AI Multi-Agent</h4>
                <p className="text-muted-foreground">3 chuyên gia AI: Form Agent, OCR Agent, Tax Validator</p>
              </div>
              <div className="text-center space-y-2">
                <Upload className="w-8 h-8 text-primary mx-auto" />
                <h4 className="font-medium">Xử lý tài liệu</h4>
                <p className="text-muted-foreground">Tự động trích xuất dữ liệu từ PDF, XML, hình ảnh</p>
              </div>
              <div className="text-center space-y-2">
                <FileText className="w-8 h-8 text-primary mx-auto" />
                <h4 className="font-medium">Tương thích HTKK</h4>
                <p className="text-muted-foreground">100% tương thích với hệ thống HTKK của Tổng cục Thuế</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
