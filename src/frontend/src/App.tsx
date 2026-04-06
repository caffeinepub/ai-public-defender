import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Briefcase,
  ChevronRight,
  FileText,
  Gavel,
  Globe,
  HelpCircle,
  History,
  Library,
  Lightbulb,
  Loader2,
  Menu,
  MessageSquare,
  Plus,
  Scale,
  Send,
  Settings,
  Shield,
  ThumbsUp,
  Upload,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { CaseAnalysisResult, FeedbackResponse } from "./backend";
import { useActor } from "./hooks/useActor";

type Screen = "home" | "results" | "practice" | "feedback";

interface ChatMessage {
  role: "ai" | "user";
  text: string;
}

const LAW_TYPES = [
  { id: "Family Law", label: "Family Law", icon: Users },
  { id: "Cyber Law", label: "Cyber Law", icon: Globe },
  { id: "Criminal Law", label: "Criminal Law", icon: Shield },
  { id: "Civil Law", label: "Civil Law", icon: Scale },
  { id: "Corporate Law", label: "Corporate Law", icon: Briefcase },
  { id: "Constitutional Law", label: "Constitutional Law", icon: BookOpen },
  { id: "Other", label: "Other", icon: HelpCircle },
];

const SIDEBAR_ITEMS = [
  { id: "new", label: "NEW ANALYSIS", icon: Plus },
  { id: "history", label: "HISTORY", icon: History },
  { id: "resources", label: "RESOURCES", icon: Library },
  { id: "profile", label: "PROFILE", icon: UserCircle },
  { id: "settings", label: "SETTINGS", icon: Settings },
];

export default function App() {
  const { actor } = useActor();
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedLaw, setSelectedLaw] = useState<string>("");
  const [caseDescription, setCaseDescription] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [documentContext, setDocumentContext] = useState<string | undefined>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<CaseAnalysisResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<FeedbackResponse | null>(
    null,
  );
  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message change only
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleReset = () => {
    setScreen("home");
    setSelectedLaw("");
    setCaseDescription("");
    setUploadedFileName("");
    setDocumentContext(undefined);
    setAnalysisResult(null);
    setChatMessages([]);
    setUserInput("");
    setFeedbackResult(null);
    setSidebarOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsUploadingDoc(true);

    try {
      const text = await file.text();
      setDocumentContext(text.slice(0, 3000));
      toast.success(`"${file.name}" loaded for analysis`);
    } catch (err) {
      console.error("Document load error:", err);
      toast.error("Failed to process document");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedLaw || !caseDescription.trim()) return;

    setIsAnalyzing(true);
    try {
      if (!actor) throw new Error("Backend not ready");
      const result = await actor.analyzeCase({
        lawType: selectedLaw,
        caseDescription: caseDescription.trim(),
        documentContext,
      });
      setAnalysisResult(result);
      setScreen("results");
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error("Failed to analyze case. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartPractice = async () => {
    if (!analysisResult) return;

    setScreen("practice");
    setChatMessages([]);
    setIsSendingMessage(true);

    try {
      const openingContext =
        analysisResult.oppositionArguments[0] ||
        "Let's begin the practice session.";
      if (!actor) throw new Error("Backend not ready");
      const response = await actor.practiceMode({
        lawType: selectedLaw,
        conversationHistory: [],
        userInput: openingContext,
      });
      setChatMessages([{ role: "ai", text: response.counterArgument }]);
    } catch (err) {
      console.error("Practice start error:", err);
      toast.error("Failed to start practice mode.");
      setChatMessages([
        {
          role: "ai",
          text:
            analysisResult.oppositionArguments[0] ||
            "Let's begin. How do you respond to the charges against you?",
        },
      ]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isSendingMessage) return;

    const userText = userInput.trim();
    setUserInput("");

    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", text: userText },
    ];
    setChatMessages(newMessages);
    setIsSendingMessage(true);

    try {
      const history = newMessages.map(
        (m) => `${m.role === "ai" ? "AI" : "User"}: ${m.text}`,
      );
      if (!actor) throw new Error("Backend not ready");
      if (!actor) throw new Error("Backend not ready");
      const response = await actor.practiceMode({
        lawType: selectedLaw,
        conversationHistory: history,
        userInput: userText,
      });
      setChatMessages((prev) => [
        ...prev,
        { role: "ai", text: response.counterArgument },
      ]);
    } catch (err) {
      console.error("Practice message error:", err);
      toast.error("Failed to get AI response.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleEndPractice = async () => {
    if (chatMessages.length === 0) {
      setScreen("home");
      return;
    }

    setIsFetchingFeedback(true);
    setScreen("feedback");

    try {
      const fullConversation = chatMessages.map(
        (m) => `${m.role === "ai" ? "AI" : "User"}: ${m.text}`,
      );
      if (!actor) throw new Error("Backend not ready");
      const feedback = await actor.getFeedback({
        lawType: selectedLaw,
        fullConversation,
      });
      setFeedbackResult(feedback);
    } catch (err) {
      console.error("Feedback error:", err);
      toast.error("Failed to get feedback.");
      setFeedbackResult({
        strengths: ["You engaged with the practice session."],
        weaknesses: ["Unable to fetch detailed feedback at this time."],
        suggestions: ["Try practicing again for a more thorough analysis."],
      });
    } finally {
      setIsFetchingFeedback(false);
    }
  };

  const canAnalyze =
    selectedLaw && caseDescription.trim().length > 0 && !isAnalyzing;

  return (
    <div className="min-h-screen legal-bg flex relative overflow-x-hidden">
      {/* Background gradient overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.09 0.03 250) 0%, oklch(0.14 0.05 240) 50%, oklch(0.10 0.04 235) 100%)",
        }}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col relative z-10 pr-0 lg:pr-16">
        <AnimatePresence mode="wait">
          {screen === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-1"
            >
              <HomeScreen
                selectedLaw={selectedLaw}
                setSelectedLaw={setSelectedLaw}
                caseDescription={caseDescription}
                setCaseDescription={setCaseDescription}
                uploadedFileName={uploadedFileName}
                isUploadingDoc={isUploadingDoc}
                fileInputRef={fileInputRef}
                handleFileUpload={handleFileUpload}
                handleAnalyze={handleAnalyze}
                canAnalyze={!!canAnalyze}
                isAnalyzing={isAnalyzing}
                onMenuToggle={() => setSidebarOpen((o) => !o)}
              />
            </motion.div>
          )}

          {screen === "results" && analysisResult && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-1"
            >
              <ResultsScreen
                analysisResult={analysisResult}
                selectedLaw={selectedLaw}
                onBack={() => setScreen("home")}
                onStartPractice={handleStartPractice}
                onMenuToggle={() => setSidebarOpen((o) => !o)}
              />
            </motion.div>
          )}

          {screen === "practice" && (
            <motion.div
              key="practice"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-1"
            >
              <PracticeScreen
                selectedLaw={selectedLaw}
                chatMessages={chatMessages}
                userInput={userInput}
                setUserInput={setUserInput}
                isSendingMessage={isSendingMessage}
                chatEndRef={chatEndRef}
                handleSendMessage={handleSendMessage}
                handleEndPractice={handleEndPractice}
                onMenuToggle={() => setSidebarOpen((o) => !o)}
              />
            </motion.div>
          )}

          {screen === "feedback" && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-1"
            >
              <FeedbackScreen
                feedbackResult={feedbackResult}
                isFetchingFeedback={isFetchingFeedback}
                selectedLaw={selectedLaw}
                onNewAnalysis={handleReset}
                onMenuToggle={() => setSidebarOpen((o) => !o)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Sidebar */}
      <RightSidebar
        currentScreen={screen}
        onNewAnalysis={handleReset}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "oklch(0.17 0.05 240)",
            border: "1px solid oklch(0.71 0.12 76 / 0.4)",
            color: "oklch(0.97 0.01 252)",
          },
        }}
      />
    </div>
  );
}

/* ========== RIGHT SIDEBAR ========== */
function RightSidebar({
  currentScreen,
  onNewAnalysis,
  isOpen,
  onClose,
}: {
  currentScreen: Screen;
  onNewAnalysis: () => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Desktop sidebar (always visible) */}
      <aside className="hidden lg:flex fixed right-0 top-0 h-full w-16 glass-sidebar flex-col items-center py-6 gap-6 z-40">
        <div className="w-10 h-10 rounded-full border-2 border-gold flex items-center justify-center mb-2">
          <UserCircle className="w-6 h-6 text-gold" />
        </div>
        <Separator className="w-8 bg-gold/20" />
        <nav className="flex flex-col gap-4 flex-1 items-center mt-2">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === "new" && currentScreen === "home";
            return (
              <button
                type="button"
                key={item.id}
                title={item.label}
                onClick={() => item.id === "new" && onNewAnalysis()}
                data-ocid={`sidebar.${item.id}.button`}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 group relative ${
                  isActive
                    ? "bg-gold text-navy"
                    : "text-muted-foreground hover:text-gold hover:bg-gold/10"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="absolute right-14 text-xs font-medium whitespace-nowrap bg-navy-light px-2 py-1 rounded border border-gold/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="text-[8px] text-muted-foreground/50 mt-auto">
          &copy; {new Date().getFullYear()}
        </div>
      </aside>

      {/* Mobile sidebar (slide-in) */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-64 glass-sidebar flex flex-col py-6 px-5 z-50 lg:hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-gold flex items-center justify-center">
                  <UserCircle className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Legal Practitioner
                  </p>
                  <p className="text-xs text-muted-foreground">Practice Mode</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Separator className="bg-gold/20 mb-6" />
            <nav className="flex flex-col gap-1">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === "new" && currentScreen === "home";
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      if (item.id === "new") {
                        onNewAnalysis();
                        onClose();
                      }
                    }}
                    data-ocid={`mobile.sidebar.${item.id}.button`}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-left ${
                      isActive
                        ? "bg-gold/20 text-gold border border-gold/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-xs font-semibold tracking-wider">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

/* ========== HEADER ========== */
function AppHeader({
  title,
  subtitle,
  onMenuToggle,
}: {
  title?: string;
  subtitle?: string;
  onMenuToggle?: () => void;
}) {
  return (
    <header className="text-center pt-12 pb-6 px-6">
      <div className="flex items-center justify-between mb-4 lg:justify-center">
        <Gavel className="w-6 h-6 text-gold opacity-60 lg:hidden" />
        <div className="flex-1" />
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden text-muted-foreground hover:text-gold transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
      </div>
      <div className="flex justify-center items-center gap-3 mb-3">
        <Gavel className="w-7 h-7 text-gold hidden lg:block" />
        <h1
          className="font-display text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-widest"
          style={{ color: "oklch(0.71 0.12 76)" }}
        >
          {title ?? "AI PUBLIC DEFENDER"}
        </h1>
        <Gavel className="w-7 h-7 text-gold hidden lg:block rotate-180" />
      </div>
      <p className="text-lg md:text-xl font-semibold text-foreground/90 tracking-wide">
        {subtitle ?? "Your Intelligent Legal Practice Assistant"}
      </p>
      <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
        AI-powered legal preparation and training &mdash; not a substitute for
        professional legal advice
      </p>
      <div
        className="mt-4 h-px w-32 mx-auto"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.71 0.12 76), transparent)",
        }}
      />
    </header>
  );
}

/* ========== HOME SCREEN ========== */
function HomeScreen({
  selectedLaw,
  setSelectedLaw,
  caseDescription,
  setCaseDescription,
  uploadedFileName,
  isUploadingDoc,
  fileInputRef,
  handleFileUpload,
  handleAnalyze,
  canAnalyze,
  isAnalyzing,
  onMenuToggle,
}: {
  selectedLaw: string;
  setSelectedLaw: (v: string) => void;
  caseDescription: string;
  setCaseDescription: (v: string) => void;
  uploadedFileName: string;
  isUploadingDoc: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAnalyze: () => void;
  canAnalyze: boolean;
  isAnalyzing: boolean;
  onMenuToggle: () => void;
}) {
  return (
    <main className="max-w-3xl mx-auto px-4 pb-16">
      <AppHeader onMenuToggle={onMenuToggle} />

      <div className="space-y-8">
        {/* Law Type Selection */}
        <section aria-labelledby="law-type-label">
          <p
            id="law-type-label"
            className="block text-xs font-bold tracking-widest uppercase text-gold mb-3"
          >
            01 &mdash; Law Type Selection
          </p>
          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
            role="radiogroup"
            aria-labelledby="law-type-label"
          >
            {LAW_TYPES.map((law) => {
              const Icon = law.icon;
              const isSelected = selectedLaw === law.id;
              return (
                <button
                  type="button"
                  key={law.id}
                  onClick={() => setSelectedLaw(law.id)}
                  aria-pressed={isSelected}
                  data-ocid="home.law_type.button"
                  className={`flex items-center gap-2 px-4 py-4 rounded-xl border-2 transition-all duration-200 text-left group ${
                    isSelected
                      ? "border-gold bg-gold text-navy font-semibold shadow-gold"
                      : "border-gold/40 bg-navy-light text-foreground hover:border-gold/80 hover:bg-gold/5"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      isSelected ? "text-navy" : "text-gold"
                    }`}
                  />
                  <span className="text-sm font-medium leading-tight">
                    {law.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Case Description */}
        <section>
          <label
            htmlFor="case-description"
            className="block text-xs font-bold tracking-widest uppercase text-gold mb-3"
          >
            02 &mdash; Case Description
          </label>
          <Textarea
            id="case-description"
            value={caseDescription}
            onChange={(e) => setCaseDescription(e.target.value)}
            placeholder="Describe your legal issue in detail... Include relevant facts, dates, parties involved, and any prior legal proceedings."
            rows={6}
            data-ocid="home.case.textarea"
            className="w-full text-sm resize-none border-border/60 focus:border-gold/60 focus:ring-gold/30 transition-colors placeholder:text-muted-foreground/40"
            style={{
              background: "oklch(0.11 0.04 240)",
              borderRadius: "0.75rem",
            }}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {caseDescription.length} characters &mdash; more detail yields
            better analysis
          </p>
        </section>

        {/* Document Upload */}
        <section aria-labelledby="doc-upload-label">
          <p
            id="doc-upload-label"
            className="block text-xs font-bold tracking-widest uppercase text-gold mb-3"
          >
            03 &mdash; Supporting Documents{" "}
            <span className="text-muted-foreground font-normal normal-case tracking-normal text-xs ml-1">
              (optional)
            </span>
          </p>
          <button
            type="button"
            className="w-full border-2 border-dashed border-gold/30 rounded-xl p-6 flex flex-col items-center gap-3 hover:border-gold/60 transition-colors cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload document"
            data-ocid="home.document.dropzone"
          >
            {isUploadingDoc ? (
              <>
                <div className="gold-spinner" />
                <p className="text-sm text-muted-foreground">
                  Uploading document...
                </p>
              </>
            ) : uploadedFileName ? (
              <>
                <FileText className="w-8 h-8 text-gold" />
                <p className="text-sm font-medium text-foreground">
                  {uploadedFileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Click to replace
                </p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground group-hover:text-gold transition-colors" />
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  Upload PDF, TXT, or DOC files
                </p>
                <p className="text-xs text-muted-foreground">
                  Drag &amp; drop or click to browse
                </p>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            className="hidden"
            onChange={handleFileUpload}
            data-ocid="home.document.upload_button"
          />
        </section>

        {/* Analyze CTA */}
        <Button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          data-ocid="home.analyze.primary_button"
          className="w-full h-14 text-base font-bold tracking-wider uppercase rounded-xl transition-all duration-200 disabled:opacity-40"
          style={{
            background: canAnalyze
              ? "oklch(0.71 0.12 76)"
              : "oklch(0.30 0.05 240)",
            color: canAnalyze ? "oklch(0.13 0.04 240)" : "oklch(0.50 0.03 240)",
          }}
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing Case...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Analyze Case
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </Button>

        {isAnalyzing && (
          <div data-ocid="home.analyze.loading_state" className="text-center">
            <p className="text-sm text-muted-foreground animate-pulse-gold">
              AI is reviewing your case under {selectedLaw}...
            </p>
          </div>
        )}
      </div>

      <footer className="text-center mt-16 pb-4">
        <p className="text-xs text-muted-foreground/50">
          &copy; {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gold/70 transition-colors"
          >
            Built with &hearts; using caffeine.ai
          </a>
        </p>
      </footer>
    </main>
  );
}

/* ========== RESULTS SCREEN ========== */
function ResultsScreen({
  analysisResult,
  selectedLaw,
  onBack,
  onStartPractice,
  onMenuToggle,
}: {
  analysisResult: CaseAnalysisResult;
  selectedLaw: string;
  onBack: () => void;
  onStartPractice: () => void;
  onMenuToggle: () => void;
}) {
  return (
    <main className="max-w-4xl mx-auto px-4 pb-16">
      <AppHeader
        title="Case Analysis"
        subtitle={`${selectedLaw} — Results Dashboard`}
        onMenuToggle={onMenuToggle}
      />

      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={onBack}
          data-ocid="results.back.button"
          className="text-muted-foreground hover:text-gold hover:bg-gold/10 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
        <Badge className="border-gold/40 text-gold" variant="outline">
          {selectedLaw}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Legal Guidance Card */}
        <Card
          data-ocid="results.guidance.card"
          className="border-0 overflow-hidden"
          style={{ background: "oklch(0.15 0.05 240)" }}
        >
          <CardHeader
            className="pb-3"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.22 0.06 160 / 0.4), oklch(0.15 0.05 240))",
              borderBottom: "1px solid oklch(0.35 0.10 160 / 0.3)",
            }}
          >
            <CardTitle className="flex items-center gap-2 text-base">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "oklch(0.22 0.10 160 / 0.4)" }}
              >
                <Scale
                  className="w-4 h-4"
                  style={{ color: "oklch(0.72 0.17 160)" }}
                />
              </div>
              <span style={{ color: "oklch(0.72 0.17 160)" }}>
                Legal Guidance
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-sm">
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-1">
                Case Type
              </p>
              <p className="text-foreground">{analysisResult.caseType}</p>
            </div>
            <Separator className="bg-border/40" />
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-1">
                Applicable Law
              </p>
              <p className="text-foreground">{analysisResult.applicableLaw}</p>
            </div>
            <Separator className="bg-border/40" />
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-1">
                Your Rights
              </p>
              <p className="text-foreground">{analysisResult.userRights}</p>
            </div>
            <Separator className="bg-border/40" />
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-1">
                Procedure
              </p>
              <p className="text-foreground">{analysisResult.procedure}</p>
            </div>
          </CardContent>
        </Card>

        {/* Opposition Arguments Card */}
        <Card
          data-ocid="results.opposition.card"
          className="border-0 overflow-hidden"
          style={{ background: "oklch(0.15 0.05 240)" }}
        >
          <CardHeader
            className="pb-3"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.18 0.06 240 / 0.6), oklch(0.15 0.05 240))",
              borderBottom: "1px solid oklch(0.35 0.08 240 / 0.3)",
            }}
          >
            <CardTitle className="flex items-center gap-2 text-base">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "oklch(0.20 0.08 260 / 0.4)" }}
              >
                <Shield
                  className="w-4 h-4"
                  style={{ color: "oklch(0.65 0.18 260)" }}
                />
              </div>
              <span style={{ color: "oklch(0.65 0.18 260)" }}>
                Opposition Arguments
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3">
              Arguments against you &mdash; be prepared
            </p>
            <ul className="space-y-3">
              {analysisResult.oppositionArguments.map((arg, i) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: static list from API
                  key={i}
                  data-ocid={`results.opposition.item.${i + 1}`}
                  className="flex gap-3 text-sm text-foreground"
                >
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                    style={{
                      background: "oklch(0.71 0.12 76 / 0.15)",
                      color: "oklch(0.71 0.12 76)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>{arg}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Ready to practice defending your case against an AI opponent?
        </p>
        <Button
          onClick={onStartPractice}
          data-ocid="results.practice.primary_button"
          className="h-14 px-10 text-base font-bold tracking-wider uppercase rounded-xl"
          style={{
            background: "oklch(0.71 0.12 76)",
            color: "oklch(0.13 0.04 240)",
          }}
        >
          <MessageSquare className="w-5 h-5 mr-2" />
          Start Practice Mode
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </main>
  );
}

/* ========== PRACTICE SCREEN ========== */
function PracticeScreen({
  selectedLaw,
  chatMessages,
  userInput,
  setUserInput,
  isSendingMessage,
  chatEndRef,
  handleSendMessage,
  handleEndPractice,
  onMenuToggle,
}: {
  selectedLaw: string;
  chatMessages: ChatMessage[];
  userInput: string;
  setUserInput: (v: string) => void;
  isSendingMessage: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  handleSendMessage: () => void;
  handleEndPractice: () => void;
  onMenuToggle: () => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 pb-4 h-screen flex flex-col">
      <AppHeader
        title="Practice Mode"
        subtitle={`${selectedLaw} — AI Opponent`}
        onMenuToggle={onMenuToggle}
      />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-muted-foreground">
            AI Opponent Active
          </span>
        </div>
        <Button
          variant="outline"
          onClick={handleEndPractice}
          data-ocid="practice.end.button"
          className="text-sm border-gold/30 text-muted-foreground hover:border-gold hover:text-gold"
        >
          End Practice &amp; Get Feedback
        </Button>
      </div>

      {/* Chat Area */}
      <ScrollArea
        data-ocid="practice.chat.panel"
        className="flex-1 rounded-xl border overflow-hidden mb-4"
        style={{ border: "1px solid oklch(0.28 0.05 240)" }}
      >
        <div className="p-4 space-y-4">
          {chatMessages.length === 0 ? (
            <div
              data-ocid="practice.chat.loading_state"
              className="flex items-center justify-center gap-3 py-16 text-muted-foreground"
            >
              <div className="gold-spinner" />
              <p className="text-sm">
                AI opponent is preparing opening argument...
              </p>
            </div>
          ) : (
            chatMessages.map((msg, i) => (
              <motion.div
                // biome-ignore lint/suspicious/noArrayIndexKey: append-only chat list
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                data-ocid={`practice.message.item.${i + 1}`}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div className="max-w-[80%]">
                  <p
                    className="text-xs font-semibold mb-1"
                    style={{
                      color:
                        msg.role === "user"
                          ? "oklch(0.71 0.12 76)"
                          : "oklch(0.71 0.12 76)",
                      textAlign: msg.role === "user" ? "right" : "left",
                    }}
                  >
                    {msg.role === "ai" ? "\u2696\uFE0F AI Opponent" : "You"}
                  </p>
                  <div
                    className={`px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "ai" ? "bubble-ai" : "bubble-user"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </motion.div>
            ))
          )}
          {isSendingMessage && chatMessages.length > 0 && (
            <div className="flex justify-start">
              <div className="bubble-ai px-4 py-3 flex items-center gap-2">
                <div
                  className="gold-spinner"
                  style={{ width: "16px", height: "16px", borderWidth: "2px" }}
                />
                <span className="text-xs text-muted-foreground">
                  AI is formulating counter-argument...
                </span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div
        className="flex gap-3 rounded-xl p-3"
        style={{
          background: "oklch(0.17 0.05 240)",
          border: "1px solid oklch(0.28 0.05 240)",
        }}
      >
        <Textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your defense argument... (Enter to send, Shift+Enter for new line)"
          rows={2}
          disabled={isSendingMessage}
          data-ocid="practice.message.textarea"
          className="flex-1 text-sm resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40 min-h-0"
        />
        <Button
          onClick={handleSendMessage}
          disabled={!userInput.trim() || isSendingMessage}
          data-ocid="practice.message.submit_button"
          size="icon"
          className="self-end flex-shrink-0 h-10 w-10 rounded-lg disabled:opacity-40"
          style={{
            background:
              userInput.trim() && !isSendingMessage
                ? "oklch(0.71 0.12 76)"
                : "oklch(0.25 0.05 240)",
            color:
              userInput.trim() && !isSendingMessage
                ? "oklch(0.13 0.04 240)"
                : "oklch(0.50 0.03 240)",
          }}
        >
          {isSendingMessage ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </main>
  );
}

/* ========== FEEDBACK SCREEN ========== */
function FeedbackScreen({
  feedbackResult,
  isFetchingFeedback,
  selectedLaw,
  onNewAnalysis,
  onMenuToggle,
}: {
  feedbackResult: FeedbackResponse | null;
  isFetchingFeedback: boolean;
  selectedLaw: string;
  onNewAnalysis: () => void;
  onMenuToggle: () => void;
}) {
  return (
    <main className="max-w-3xl mx-auto px-4 pb-16">
      <AppHeader
        title="Practice Feedback"
        subtitle={`${selectedLaw} — Performance Analysis`}
        onMenuToggle={onMenuToggle}
      />

      {isFetchingFeedback ? (
        <div
          data-ocid="feedback.loading_state"
          className="flex flex-col items-center justify-center gap-4 py-24"
        >
          <div
            className="gold-spinner"
            style={{ width: "40px", height: "40px", borderWidth: "4px" }}
          />
          <p className="text-muted-foreground text-sm">
            Analyzing your performance...
          </p>
          <p className="text-xs text-muted-foreground/60">
            This may take a moment
          </p>
        </div>
      ) : feedbackResult ? (
        <div className="space-y-6">
          {/* Strengths */}
          <Card
            data-ocid="feedback.strengths.card"
            className="border-0 overflow-hidden"
            style={{ background: "oklch(0.15 0.05 240)" }}
          >
            <CardHeader
              className="pb-3"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.22 0.10 145 / 0.4), oklch(0.15 0.05 240))",
                borderBottom: "1px solid oklch(0.40 0.14 145 / 0.3)",
              }}
            >
              <CardTitle className="flex items-center gap-2 text-base">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "oklch(0.25 0.12 145 / 0.4)" }}
                >
                  <ThumbsUp
                    className="w-4 h-4"
                    style={{ color: "oklch(0.72 0.20 145)" }}
                  />
                </div>
                <span style={{ color: "oklch(0.72 0.20 145)" }}>Strengths</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="space-y-2">
                {feedbackResult.strengths.map((s, i) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: static feedback list
                    key={i}
                    data-ocid={`feedback.strengths.item.${i + 1}`}
                    className="flex gap-3 text-sm text-foreground"
                  >
                    <span style={{ color: "oklch(0.72 0.20 145)" }}>
                      &#10003;
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Weaknesses */}
          <Card
            data-ocid="feedback.weaknesses.card"
            className="border-0 overflow-hidden"
            style={{ background: "oklch(0.15 0.05 240)" }}
          >
            <CardHeader
              className="pb-3"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.22 0.10 30 / 0.4), oklch(0.15 0.05 240))",
                borderBottom: "1px solid oklch(0.40 0.14 30 / 0.3)",
              }}
            >
              <CardTitle className="flex items-center gap-2 text-base">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "oklch(0.25 0.12 30 / 0.4)" }}
                >
                  <AlertTriangle
                    className="w-4 h-4"
                    style={{ color: "oklch(0.72 0.20 40)" }}
                  />
                </div>
                <span style={{ color: "oklch(0.72 0.20 40)" }}>Weaknesses</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="space-y-2">
                {feedbackResult.weaknesses.map((w, i) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: static feedback list
                    key={i}
                    data-ocid={`feedback.weaknesses.item.${i + 1}`}
                    className="flex gap-3 text-sm text-foreground"
                  >
                    <span style={{ color: "oklch(0.72 0.20 40)" }}>
                      &#9888;
                    </span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Suggestions */}
          <Card
            data-ocid="feedback.suggestions.card"
            className="border-0 overflow-hidden"
            style={{ background: "oklch(0.15 0.05 240)" }}
          >
            <CardHeader
              className="pb-3"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.20 0.08 260 / 0.4), oklch(0.15 0.05 240))",
                borderBottom: "1px solid oklch(0.40 0.14 260 / 0.3)",
              }}
            >
              <CardTitle className="flex items-center gap-2 text-base">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "oklch(0.22 0.10 260 / 0.4)" }}
                >
                  <Lightbulb
                    className="w-4 h-4"
                    style={{ color: "oklch(0.70 0.18 260)" }}
                  />
                </div>
                <span style={{ color: "oklch(0.70 0.18 260)" }}>
                  Suggestions
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="space-y-2">
                {feedbackResult.suggestions.map((s, i) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: static feedback list
                    key={i}
                    data-ocid={`feedback.suggestions.item.${i + 1}`}
                    className="flex gap-3 text-sm text-foreground"
                  >
                    <span style={{ color: "oklch(0.70 0.18 260)" }}>
                      &#8594;
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="text-center pt-4">
            <Button
              onClick={onNewAnalysis}
              data-ocid="feedback.new_analysis.primary_button"
              className="h-14 px-10 text-base font-bold tracking-wider uppercase rounded-xl"
              style={{
                background: "oklch(0.71 0.12 76)",
                color: "oklch(0.13 0.04 240)",
              }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Start New Analysis
            </Button>
          </div>
        </div>
      ) : (
        <div
          data-ocid="feedback.error_state"
          className="text-center py-16 text-muted-foreground"
        >
          <p className="mb-4">Unable to load feedback. Please try again.</p>
          <Button
            variant="outline"
            onClick={onNewAnalysis}
            className="border-gold/30 text-gold hover:bg-gold/10"
          >
            Return to Home
          </Button>
        </div>
      )}
    </main>
  );
}
