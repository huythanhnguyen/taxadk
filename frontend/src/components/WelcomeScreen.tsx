import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputForm } from "@/components/InputForm";
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
  handleSubmit: (query: string, imageFile?: File | null, audioFile?: File | null, documentFile?: File | null) => void;
  isLoading: boolean;
  onCancel: () => void;
  onTaxFormSelect: (formType: string) => void;
}

export function WelcomeScreen({ handleSubmit, isLoading, onTaxFormSelect }: WelcomeScreenProps) {
  const handleQuickSubmit = (quickQuery: string) => {
    handleSubmit(quickQuery);
  };

  const handleInputSubmit = (query: string, imageFile: File | null, audioFile: File | null, documentFile?: File | null) => {
    handleSubmit(query, imageFile, audioFile, documentFile);
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
    <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 overflow-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-7xl space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-full bg-primary/10 border border-primary/20">
              <Calculator className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              HTKK AI
            </h1>
          </div>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Hệ thống kê khai thuế thông minh với AI - Tự động hóa quy trình thuế của bạn
          </p>
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
            <span>Được hỗ trợ bởi Google ADK Multi-Agent AI</span>
          </div>
        </div>

        {/* Quick Chat Input */}
        <div className="space-y-3 sm:space-y-4">
          <div className="text-center">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
              Chat với AI Assistant
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 px-4">
              Đặt câu hỏi về thuế, tải lên tài liệu, ghi âm voice hoặc yêu cầu hỗ trợ
            </p>
          </div>
          <InputForm 
            onSubmit={handleInputSubmit}
            isLoading={isLoading}
            context="homepage"
          />
        </div>

        {/* Quick Actions */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-center">Hành động nhanh</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {quickActions.map((action, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-border/50 hover:border-primary/50"
                onClick={() => handleQuickSubmit(action.query)}
              >
                <CardContent className="p-3 sm:p-4 text-center space-y-2 sm:space-y-3">
                  <div className="flex justify-center">
                    <div className="p-2 sm:p-3 rounded-full bg-primary/10">
                      <action.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs sm:text-sm">{action.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{action.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Tax Forms */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-center">Tờ khai thuế</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {taxForms.map((form, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-border/50 hover:border-primary/50"
                onClick={() => onTaxFormSelect(form.code)}
              >
                <CardContent className="p-4 sm:p-6 text-center space-y-3 sm:space-y-4">
                  <div className="flex justify-center">
                    <div className="p-3 sm:p-4 rounded-full bg-primary/10">
                      <form.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg">{form.code}</h3>
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
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-center">Tính năng nổi bật</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-sm">
              <div className="text-center space-y-2">
                <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto" />
                <h4 className="font-medium text-sm sm:text-base">AI Multi-Agent</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">3 chuyên gia AI: Form Agent, OCR Agent, Tax Validator</p>
              </div>
              <div className="text-center space-y-2">
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto" />
                <h4 className="font-medium text-sm sm:text-base">Xử lý tài liệu</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">Tự động trích xuất dữ liệu từ PDF, XML, hình ảnh</p>
              </div>
              <div className="text-center space-y-2 sm:col-span-2 lg:col-span-1">
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto" />
                <h4 className="font-medium text-sm sm:text-base">Tương thích HTKK</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">100% tương thích với hệ thống HTKK của Tổng cục Thuế</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
