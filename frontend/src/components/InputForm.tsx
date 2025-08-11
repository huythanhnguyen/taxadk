import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Mic, Image as ImageIcon, FileText, X, Check, Play, Pause, Square, Info } from "lucide-react";

interface InputFormProps {
  onSubmit: (query: string, imageFile: File | null, audioFile: File | null, documentFile?: File | null) => void;
  isLoading: boolean;
  context?: 'homepage' | 'chat';
}

export function InputForm({ onSubmit, isLoading, context = 'homepage' }: InputFormProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(32).fill(0));
  const [showRecordingHelp, setShowRecordingHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const waveformBufferRef = useRef<number[]>([]);
  const maxRecordingTime = 131; // 131 seconds limit

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space bar to toggle recording (only when not focused on textarea)
      if (e.code === 'Space' && e.target !== textareaRef.current && !e.repeat) {
        e.preventDefault();
        toggleVoiceRecording();
      }
      
      // Escape to cancel recording
      if (e.key === 'Escape' && isRecording) {
        e.preventDefault();
        cancelRecording();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
    };
  }, []);

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Waveform visualization with scrolling effect
  const updateWaveform = () => {
    if (analyserRef.current) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Get frequency data for better visualization
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume from frequency data
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const averageVolume = sum / bufferLength;
      
      // Convert to percentage and amplify for better visibility
      const volumePercent = Math.min(100, (averageVolume / 255) * 300);
      
      // Create scrolling waveform effect
      const barCount = window.innerWidth < 640 ? 32 : 24;
      
      if (waveformBufferRef.current.length === 0) {
        waveformBufferRef.current = new Array(barCount).fill(0);
      }
      
      // Scroll from right to left: remove first element, add new at end
      waveformBufferRef.current.shift();
      waveformBufferRef.current.push(volumePercent);
      
      // Update display
      setWaveformData([...waveformBufferRef.current]);
    }
    // Schedule next frame if analyser still exists
    if (analyserRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    }
  };

  // Audio context setup
  const setupAudioContext = async (stream: MediaStream) => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Configure analyser for better frequency detection
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;

      // Connect stream to analyser
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Initialize waveform buffer
      const barCount = window.innerWidth < 640 ? 32 : 24;
      waveformBufferRef.current = new Array(barCount).fill(0);

      // Start waveform animation
      updateWaveform();
    } catch (error) {
      console.error('Audio context setup error:', error);
    }
  };

  const startRecording = async () => {
    try {
      // Reset states
      setRecordedAudio(null);
      setRecordingTime(0);
      setWaveformData(new Array(32).fill(0));
      
      // Stop any existing audio playback
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Setup audio visualization
      await setupAudioContext(stream);

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioFile = new File([audioBlob], `recording_${Date.now()}.webm`, { type: mimeType });
        
        setRecordedAudio(audioFile);
        
        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        
        analyserRef.current = null;
        setWaveformData(new Array(32).fill(0));
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      let startTime = Date.now();
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = Math.floor((Date.now() - startTime) / 1000);
          if (newTime >= maxRecordingTime) {
            stopRecording();
            return maxRecordingTime;
          }
          return newTime;
        });
      }, 1000);

    } catch (error) {
      console.error('Recording error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('Không được phép truy cập microphone. Vui lòng cấp quyền trong cài đặt trình duyệt.');
        } else if (error.name === 'NotFoundError') {
          alert('Không tìm thấy microphone. Vui lòng kiểm tra thiết bị âm thanh.');
        } else if (error.name === 'NotReadableError') {
          alert('Lỗi truy cập microphone. Vui lòng thử lại.');
        }
      } else {
        alert('Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      setRecordedAudio(null);
      
      // Cleanup immediately
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      analyserRef.current = null;
      setWaveformData(new Array(32).fill(0));
    }
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const playRecordedAudio = async () => {
    if (!recordedAudio) return;

    try {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        setIsPlaying(false);
        audioElementRef.current = null;
      }

      const audioUrl = URL.createObjectURL(recordedAudio);
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onpause = () => {
        setIsPlaying(false);
      };

      setIsPlaying(true);
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const pauseAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && !selectedImage && !selectedDocument && !recordedAudio) return;

    onSubmit(inputValue.trim(), selectedImage, recordedAudio, selectedDocument);
    setInputValue("");
    setSelectedImage(null);
    setSelectedDocument(null);
    setRecordedAudio(null);
    setRecordingTime(0);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
    }
  };

  const handleDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'text/xml',
        'application/xml',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      const allowedExtensions = ['.pdf', '.xml', '.doc', '.docx'];
      
      const isValidType = allowedTypes.includes(file.type);
      const isValidExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (isValidType || isValidExtension) {
        setSelectedDocument(file);
        console.log('Document selected:', file.name, file.type);
      } else {
        alert('Chỉ hỗ trợ file PDF, XML, DOC, DOCX');
        // Reset input
        if (documentInputRef.current) {
          documentInputRef.current.value = '';
        }
      }
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const removeSelectedDocument = () => {
    setSelectedDocument(null);
    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
  };

  const clearRecordedAudio = () => {
    setRecordedAudio(null);
    setRecordingTime(0);
  };

  // Get voice button variant based on state
  const getVoiceButtonVariant = () => {
    if (isRecording) return "destructive";
    if (recordedAudio) return "default";
    return "outline";
  };

  // Get voice button classes for enhanced visual states
  const getVoiceButtonClasses = () => {
    if (isRecording) return "animate-pulse bg-red-500 hover:bg-red-600 text-white";
    if (recordedAudio) return "bg-green-500 hover:bg-green-600 text-white";
    return "";
  };

  return (
    <div className="w-full space-y-4">
      <Card className={context === 'homepage' ? "border-2 border-primary/20 shadow-lg" : ""}>
        <CardContent className={context === 'homepage' ? "p-6" : "p-4"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              {/* Main Input Area */}
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  placeholder="Nhập tin nhắn của bạn..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="min-h-[80px] resize-none pr-20"
                  disabled={isLoading || isRecording}
                />
                
                {/* Recording Help Button */}
                {!isRecording && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRecordingHelp(!showRecordingHelp)}
                    className="absolute top-2 right-12 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    title="Hướng dẫn ghi âm"
                  >
                    <Info className="h-3 w-3" />
                  </Button>
                )}

                {/* Voice Button */}
                <Button
                  type="button"
                  size="sm"
                  variant={getVoiceButtonVariant()}
                  onClick={toggleVoiceRecording}
                  title={
                    isRecording ? "Dừng ghi âm (Space)" : 
                    recordedAudio ? "Đã ghi âm - Nhấn để ghi lại (Space)" : 
                    "Bắt đầu ghi âm (Space)"
                  }
                  className={`absolute top-2 right-2 h-10 w-10 ${getVoiceButtonClasses()}`}
                  disabled={isLoading}
                >
                  {isRecording ? (
                    <Square className="h-5 w-5" />
                  ) : recordedAudio ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button 
                  type="submit" 
                  disabled={isLoading || (!inputValue.trim() && !selectedImage && !selectedDocument && !recordedAudio)}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Gửi
                    </>
                  )}
                </Button>

                {/* Image Upload Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isLoading || isRecording}
                  title="Tải lên hình ảnh"
                  className="h-10 w-10 p-0"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>

                {/* Document Upload Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => documentInputRef.current?.click()}
                  disabled={isLoading || isRecording}
                  title="Tải lên tài liệu (PDF, XML, DOC, DOCX)"
                  className="h-10 w-10 p-0"
                >
                  <FileText className="h-4 w-4" />
                </Button>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />

                <input
                  ref={documentInputRef}
                  type="file"
                  accept=".pdf,.xml,.doc,.docx,application/pdf,text/xml,application/xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleDocumentChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Recording Help Tooltip */}
            {showRecordingHelp && !isRecording && (
              <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                <div className="font-medium">Hướng dẫn ghi âm:</div>
                <div>• Nhấn <kbd className="px-1 py-0.5 bg-background rounded text-xs">Space</kbd> để bắt đầu/dừng ghi âm</div>
                <div>• Nhấn <kbd className="px-1 py-0.5 bg-background rounded text-xs">Esc</kbd> để hủy ghi âm</div>
                <div>• Thời gian tối đa: {formatTime(maxRecordingTime)}</div>
                <div>• Backend hỗ trợ xử lý voice trực tiếp</div>
              </div>
            )}

            {/* Recording Status with Waveform */}
            {isRecording && (
              <div className="space-y-3">
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  {/* Recording Status with Timer */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-red-700 dark:text-red-300">
                        Đang ghi âm
                      </span>
                    </div>
                    <div className="text-sm font-mono text-red-600 dark:text-red-400">
                      {formatTime(recordingTime)} / {formatTime(maxRecordingTime)}
                    </div>
                  </div>

                  {/* Waveform Visualization */}
                  <div className="flex items-center justify-center gap-1 h-16 mb-3 bg-red-50/50 dark:bg-red-950/10 rounded-lg p-2">
                    {waveformData.map((height, index) => (
                      <div
                        key={index}
                        className="bg-red-500 dark:bg-red-400 rounded-full transition-all duration-100"
                        style={{
                          width: '3px',
                          height: `${Math.max(4, (height / 100) * 48)}px`,
                          opacity: height > 5 ? 1 : 0.3
                        }}
                      />
                    ))}
                  </div>

                  {/* Recording Controls */}
                  <div className="flex gap-2 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={cancelRecording}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={stopRecording}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Square className="w-4 h-4 mr-1" />
                      Dừng
                    </Button>
                  </div>
                </div>

                {/* Mobile Recording Status */}
                <div className="md:hidden bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm">Recording</span>
                    </div>
                    <div className="text-sm font-mono">
                      {formatTime(recordingTime)} / {formatTime(maxRecordingTime)}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={cancelRecording}
                      className="flex-1 text-red-600"
                    >
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={stopRecording}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      Dừng
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Media Attachments */}
            <div className="space-y-2">
              {/* Selected Image */}
              {selectedImage && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm flex-1">{selectedImage.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(selectedImage.size / 1024).toFixed(1)} KB)
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeSelectedImage}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {/* Selected Document */}
              {selectedDocument && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm flex-1">{selectedDocument.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(selectedDocument.size / 1024).toFixed(1)} KB)
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeSelectedDocument}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {/* Recorded Audio */}
              {recordedAudio && (
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <Mic className="w-4 h-4 text-green-600" />
                  <span className="text-sm flex-1">Đã ghi âm ({formatTime(recordingTime)})</span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={playRecordedAudio}
                      title={isPlaying ? "Dừng phát" : "Phát audio"}
                      className="h-6 w-6 p-0"
                    >
                      {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearRecordedAudio}
                      title="Xóa recording"
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
