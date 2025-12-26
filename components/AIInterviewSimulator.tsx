'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/store';
import { 
  startInterview, 
  submitResponse, 
  completeInterview, 
  nextQuestion,
  setCurrentSession,
  updateSessionStatus 
} from '@/lib/slices/interviewSlice';
import { 
  createSession, 
  updateSessionActivity,
  addSession,
  removeSession 
} from '@/lib/slices/sessionSlice';
import { 
  generateFeedback, 
  setCurrentFeedback,
  addToProcessingQueue 
} from '@/lib/slices/feedbackSlice';
import { 
  initializeVapi, 
  generateAdaptiveQuestion,
  startVoiceRecording,
  stopVoiceRecording,
  setRecording,
  setConnected 
} from '@/lib/slices/vapiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  SkipForward, 
  CheckCircle, 
  Clock,
  Brain,
  TrendingUp,
  AlertCircle,
  User,
  Video,
  VideoOff,
  Monitor,
  MonitorOff
} from 'lucide-react';

interface InterviewConfig {
  jobRole: string;
  experience: string;
  difficulty: 'easy' | 'medium' | 'hard';
  categories: string[];
}

export function AIInterviewSimulator() {
  const dispatch = useAppDispatch();
  const { currentSession, loading: interviewLoading } = useAppSelector(state => state.interview);
  const { activeSessions, connectionPool } = useAppSelector(state => state.session);
  const { currentFeedback, processingQueue } = useAppSelector(state => state.feedback);
  const { isConnected, isRecording, generatedQuestions } = useAppSelector(state => state.vapi);

  const [config, setConfig] = useState<InterviewConfig>({
    jobRole: '',
    experience: '',
    difficulty: 'medium',
    categories: ['technical', 'behavioral', 'situational']
  });
  
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(120);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout>();
  const recordingTimerRef = useRef<NodeJS.Timeout>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isTimerActive && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      handleSubmitResponse();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTimerActive, timeRemaining]);

  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
    }

    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  const handleStartInterview = async (): Promise<void> => {
    try {
      // Check if camera and screen share are enabled
      if (!isCameraOn) {
        alert('Camera is required to start the interview. Please enable your camera.');
        return;
      }
      
      if (!isScreenSharing) {
        alert('Screen sharing is required to start the interview. Please start screen sharing.');
        return;
      }
      
      setIsTimerActive(false);
      setTimeRemaining(120);
      
      // Initialize Vapi first
      await dispatch(initializeVapi({
        apiKey: process.env.NEXT_PUBLIC_VAPI_API_KEY || '',
        model: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7,
        },
        voice: {
          provider: 'elevenlabs',
          voiceId: 'rachel',
        },
      })).unwrap();
      
      // Create session
      const sessionResult = await dispatch(createSession({
        userId: 'user-' + Math.random().toString(36).substr(2, 9),
        metadata: {
          userAgent: navigator.userAgent,
          ip: '127.0.0.1',
          location: 'Unknown',
          deviceType: 'desktop',
        }
      })).unwrap();
      
      dispatch(addSession(sessionResult.session));
      
      // Start interview
      const interviewResult = await dispatch(startInterview({
        sessionId: sessionResult.session.id,
        config: {
          jobRole: config.jobRole,
          experience: config.experience,
          difficulty: config.difficulty,
          category: config.categories[0] || 'technical',
        }
      })).unwrap();
      
      dispatch(setCurrentSession(interviewResult.interview));
      setIsTimerActive(true);
      
    } catch (error) {
      console.error('Failed to start interview:', error);
    }
  };

  const handleStartRecording = async () => {
    try {
      await dispatch(startVoiceRecording()).unwrap();
      dispatch(setRecording(true));
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      await dispatch(stopVoiceRecording(currentSession?.id || '')).unwrap();
      dispatch(setRecording(false));
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const handleToggleCamera = async () => {
    try {
      if (isCameraOn) {
        // Stop camera
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
        setIsCameraOn(false);
      } else {
        // Start camera
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraOn(true);
      }
    } catch (error) {
      console.error('Failed to toggle camera:', error);
      alert('Failed to access camera. Please check permissions.');
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }
        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        screenStreamRef.current = stream;
        
        // Listen for when user stops sharing
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
        });
        
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('Failed to toggle screen share:', error);
      alert('Failed to start screen sharing. Please check permissions.');
    }
  };

  const handleSubmitResponse = async () => {
    if (!currentSession || !currentResponse.trim()) return;

    try {
      setIsTimerActive(false);
      
      // Submit response
      await dispatch(submitResponse({
        sessionId: currentSession.id,
        questionId: currentSession.questions[currentSession.currentQuestionIndex].id,
        response: currentResponse,
        duration: 120 - timeRemaining,
      })).unwrap();

      // Add to feedback processing queue
      dispatch(addToProcessingQueue({
        sessionId: currentSession.id,
        questionId: currentSession.questions[currentSession.currentQuestionIndex].id,
        response: currentResponse,
        timestamp: Date.now(),
      }));

      // Generate feedback
      const feedbackResult = await dispatch(generateFeedback({
        sessionId: currentSession.id,
        questionId: currentSession.questions[currentSession.currentQuestionIndex].id,
        response: currentResponse,
      })).unwrap();

      dispatch(setCurrentFeedback(feedbackResult.feedback));

      // Move to next question or complete
      if (currentSession.currentQuestionIndex < currentSession.questions.length - 1) {
        dispatch(nextQuestion());
        setCurrentResponse('');
        setTimeRemaining(120);
        setIsTimerActive(true);
      } else {
        await handleCompleteInterview();
      }

    } catch (error) {
      console.error('Failed to submit response:', error);
    }
  };

  const handleCompleteInterview = async () => {
    if (!currentSession) return;

    try {
      await dispatch(completeInterview(currentSession.id)).unwrap();
      dispatch(updateSessionStatus({ status: 'completed' }));
      
      // Remove from active sessions
      dispatch(removeSession(currentSession.id));
      
    } catch (error) {
      console.error('Failed to complete interview:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSession) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
              <Brain className="h-6 w-6 md:h-8 md:w-8" />
              AI Interview Simulator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Role</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md text-sm md:text-base"
                  placeholder="e.g., Software Engineer"
                  value={config.jobRole}
                  onChange={(e) => setConfig({ ...config, jobRole: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="experience-select" className="text-sm font-medium text-foreground">Experience Level</label>
                <select
                  id="experience-select"
                  className="w-full p-2 border rounded-md bg-background text-foreground text-sm md:text-base"
                  value={config.experience}
                  onChange={(e) => setConfig({ ...config, experience: e.target.value })}
                >
                  <option value="">Select experience</option>
                  <option value="entry">Entry Level (0-2 years)</option>
                  <option value="mid">Mid Level (3-5 years)</option>
                  <option value="senior">Senior Level (6-10 years)</option>
                  <option value="lead">Lead/Principal (10+ years)</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="difficulty-select" className="text-sm font-medium text-foreground">Difficulty</label>
                <select
                  id="difficulty-select"
                  className="w-full p-2 border rounded-md bg-background text-foreground text-sm md:text-base"
                  value={config.difficulty}
                  onChange={(e) => setConfig({ ...config, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Categories</label>
                <div className="space-y-2">
                  {['technical', 'behavioral', 'situational'].map(category => (
                    <label key={category} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.categories.includes(category)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConfig({ ...config, categories: [...config.categories, category] });
                          } else {
                            setConfig({ ...config, categories: config.categories.filter(c => c !== category) });
                          }
                        }}
                      />
                      <span className="capitalize text-sm md:text-base">{category}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Camera and Screen Share Setup */}
              <div className="space-y-4">
                <div className="text-sm font-medium">Video & Screen Setup (Required)</div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant={isCameraOn ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleToggleCamera}
                    className="w-full"
                  >
                    {isCameraOn ? (
                      <>
                        <VideoOff className="h-4 w-4 mr-2" />
                        Camera Enabled
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4 mr-2" />
                        Enable Camera
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant={isScreenSharing ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleToggleScreenShare}
                    className="w-full"
                  >
                    {isScreenSharing ? (
                      <>
                        <MonitorOff className="h-4 w-4 mr-2" />
                        Screen Sharing Active
                      </>
                    ) : (
                      <>
                        <Monitor className="h-4 w-4 mr-2" />
                        Share Screen
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Video Preview */}
                {(isCameraOn || isScreenSharing) && (
                  <div className="space-y-2">
                    {isCameraOn && (
                      <div className="border rounded-lg p-2">
                        <h4 className="text-xs font-medium mb-1">Camera Preview</h4>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-32 bg-black rounded object-cover"
                        />
                      </div>
                    )}
                    
                    {isScreenSharing && screenStreamRef.current && (
                      <div className="border rounded-lg p-2">
                        <h4 className="text-xs font-medium mb-1">Screen Share Preview</h4>
                        <video
                          autoPlay
                          playsInline
                          className="w-full h-32 bg-black rounded object-cover"
                          ref={(video) => {
                            if (video && screenStreamRef.current) {
                              video.srcObject = screenStreamRef.current;
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Active Sessions: {Object.keys(activeSessions).length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">Vapi: {isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>
              
              <Badge variant={connectionPool.available > 20 ? 'default' : 'destructive'}>
                {connectionPool.available} connections available
              </Badge>
            </div>

            <Button 
              onClick={handleStartInterview}
              disabled={!config.jobRole || !config.experience || interviewLoading || !isCameraOn || !isScreenSharing}
              className="w-full"
            >
              {interviewLoading ? (
                <>Starting Interview...</>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Interview
                </>
              )}
            </Button>
            
            {/* Requirements Notice */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">Requirements to start:</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isCameraOn ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Camera must be enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isScreenSharing ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Screen sharing must be active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = currentSession?.questions?.[currentSession?.currentQuestionIndex || 0];
  const progress = currentSession?.questions ? ((currentSession.currentQuestionIndex + 1) / currentSession.questions.length) * 100 : 0;

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Interview Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
              <Brain className="h-6 w-6 md:h-8 md:w-8" />
              AI Interview Session
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Badge variant="outline">
                Question {(currentSession?.currentQuestionIndex || 0) + 1} of {currentSession?.questions?.length || 1}
              </Badge>
              <Badge variant={currentSession?.status === 'active' ? 'default' : 'secondary'}>
                {currentSession?.status || 'inactive'}
              </Badge>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
      </Card>

      {/* Current Question */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg md:text-xl">Current Question</CardTitle>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className={`font-mono text-sm md:text-base ${timeRemaining < 30 ? 'text-red-500' : ''}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-base md:text-lg">{currentQuestion?.text || 'Loading question...'}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline">{currentQuestion?.category || 'general'}</Badge>
                <Badge variant={currentQuestion?.difficulty === 'easy' ? 'default' : currentQuestion?.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                  {currentQuestion?.difficulty || 'medium'}
                </Badge>
              </div>
            </div>

            {/* Voice Recording Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4 border rounded-lg">
              <Button
                variant={isRecording ? 'destructive' : 'default'}
                size="sm"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className="w-full sm:w-auto"
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Stop Recording ({formatTime(recordingTime)})</span>
                    <span className="sm:hidden">Stop ({formatTime(recordingTime)})</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Start Voice Recording</span>
                    <span className="sm:hidden">Start Recording</span>
                  </>
                )}
              </Button>
              
              {isRecording && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground">Recording...</span>
                </div>
              )}
            </div>

            {/* Text Response */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Response</label>
              <Textarea
                placeholder="Type your response here or use voice recording..."
                value={currentResponse}
                onChange={(e) => setCurrentResponse(e.target.value)}
                rows={6}
                className="w-full"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button onClick={handleSubmitResponse} disabled={!currentResponse.trim()} className="w-full sm:w-auto">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Submit Response</span>
                <span className="sm:hidden">Submit</span>
              </Button>
              
              <Button variant="outline" onClick={() => dispatch(nextQuestion())} className="w-full sm:w-auto">
                <SkipForward className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Skip Question</span>
                <span className="sm:hidden">Skip</span>
              </Button>
              
              <Button variant="outline" onClick={() => setIsTimerActive(!isTimerActive)} className="w-full sm:w-auto">
                {isTimerActive ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Pause Timer</span>
                    <span className="sm:hidden">Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Resume Timer</span>
                    <span className="sm:hidden">Resume</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Feedback */}
      {currentFeedback && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Real-time Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Score</span>
                <Badge variant={currentFeedback.overallScore >= 80 ? 'default' : currentFeedback.overallScore >= 60 ? 'secondary' : 'destructive'}>
                  {currentFeedback.overallScore}/100
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(currentFeedback.categories).map(([category, score]) => (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs capitalize">{category}</span>
                      <span className="text-xs font-medium">{score}/100</span>
                    </div>
                    <Progress value={score} className="h-1" />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-green-600">Strengths:</span>
                  <ul className="text-sm text-muted-foreground mt-1">
                    {currentFeedback.strengths.map((strength: string, index: number) => (
                      <li key={index}>• {strength}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-orange-600">Areas for Improvement:</span>
                  <ul className="text-sm text-muted-foreground mt-1">
                    {currentFeedback.improvements.map((improvement: string, index: number) => (
                      <li key={index}>• {improvement}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Queue Status */}
      {processingQueue.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">
                {processingQueue.length} items in feedback processing queue
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
