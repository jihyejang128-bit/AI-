import React, { useState, useEffect, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Video, 
  Globe, 
  Cpu, 
  User, 
  Award, 
  Mail, 
  ChevronRight, 
  LogIn, 
  LogOut,
  Menu,
  X,
  Star,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { auth, signInWithGoogle, logout, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';

// --- Error Boundary ---

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let message = "문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error && parsed.error.includes("permission")) {
          message = "권한이 없습니다. 관리자에게 문의하세요.";
        }
      } catch (e) {
        // Not a JSON error
      }
      
      return (
        <div className="p-10 text-center bg-red-50 rounded-3xl border border-red-100 m-4">
          <h2 className="text-2xl font-bold text-red-600 mb-4">오류 발생</h2>
          <p className="text-slate-600 mb-6">{message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 text-white rounded-full font-bold"
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Components ---

const AdminDashboard = ({ user }) => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.email === "mychang1089@gmail.com";

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInquiries(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inquiries');
    });

    return () => unsubscribe();
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <section id="admin" className="py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-serif mb-2 text-white">관리자 대시보드</h2>
            <p className="text-slate-500 text-sm">고객들이 남긴 문의 내역을 실시간으로 확인합니다.</p>
          </div>
          <div className="px-4 py-2 bg-brand-indigo/10 text-brand-indigo rounded-full text-xs font-bold border border-brand-indigo/20">
            총 {inquiries.length}건의 문의
          </div>
        </div>

        <div className="mb-8 p-8 card-modern">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-white">
            <Globe size={18} className="text-brand-cyan" /> 구글 시트 연동 가이드
          </h3>
          <p className="text-sm text-slate-400 mb-6">
            문의 내용이 실시간으로 구글 시트에 저장되도록 설정할 수 있습니다.
          </p>
          <div className="bg-black/40 p-6 rounded-xl text-xs font-mono text-slate-300 mb-6 border border-white/5 overflow-x-auto">
            {`// 구글 시트 도구 > 스크립트 편집기에 아래 코드를 붙여넣고 '웹 앱'으로 배포하세요.
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([data.timestamp, data.type, data.name, data.email, data.userEmail, data.message]);
  return ContentService.createTextOutput("Success");
}`}
          </div>
          <p className="text-xs text-brand-cyan font-bold">
            * 배포 후 받은 URL을 환경 변수 'VITE_GOOGLE_SCRIPT_URL'에 설정해 주세요.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">로딩 중...</div>
        ) : inquiries.length === 0 ? (
          <div className="text-center py-20 card-modern border-dashed text-slate-500">
            아직 접수된 문의가 없습니다.
          </div>
        ) : (
          <div className="grid gap-6">
            {inquiries.map((inquiry) => (
              <motion.div 
                key={inquiry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-modern p-8 hover:border-brand-indigo/30 transition-all"
              >
                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                      inquiry.type === 'education' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      inquiry.type === 'product' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}>
                      {inquiry.type === 'education' ? '교육 신청' : 
                       inquiry.type === 'product' ? '상품 문의' : 
                       inquiry.type === 'business' ? '비즈니스' : '기타'}
                    </span>
                    <h4 className="font-bold text-lg text-white">{inquiry.name}</h4>
                    <span className="text-xs text-slate-500">
                      {inquiry.createdAt?.toDate().toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <a 
                      href={`mailto:${inquiry.email}?subject=${encodeURIComponent("[한국AI융합교육연구소] 문의 답변")}&body=${encodeURIComponent("안녕하세요, " + inquiry.name + "님.\n\n")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-2.5 btn-primary rounded-full text-xs"
                    >
                      <Mail size={14} /> 이메일 답장하기
                    </a>
                  </div>
                </div>
                <p className="text-slate-400 text-sm whitespace-pre-wrap bg-black/20 p-6 rounded-2xl border border-white/5">
                  {inquiry.message}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const Navbar = ({ user, onLogin, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <nav className="fixed top-0 left-0 w-full z-50 glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-indigo arch-shape flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-indigo/20">
              K
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-white hidden sm:block">
              한국AI융합교육연구소
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#about" className="text-sm font-medium hover:text-brand-cyan transition-colors">연구소 소개</a>
            <a href="#curriculum" className="text-sm font-medium hover:text-brand-cyan transition-colors">커리큘럼</a>
            <a href="#portfolio" className="text-sm font-medium hover:text-brand-cyan transition-colors">포트폴리오</a>
            <a href="#contact" className="text-sm font-medium hover:text-brand-cyan transition-colors">문의하기</a>
            {user?.email === "mychang1089@gmail.com" && (
              <a href="#admin" className="text-sm font-bold text-brand-cyan hover:underline transition-colors">관리자</a>
            )}
            
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-400">{user.displayName}님</span>
                <button 
                  onClick={onLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-white hover:bg-white/5 transition-all text-sm font-semibold"
                >
                  <LogOut size={16} /> 로그아웃
                </button>
              </div>
            ) : (
              <button 
                onClick={onLogin}
                className="flex items-center gap-2 px-6 py-2 rounded-full btn-primary text-sm"
              >
                <LogIn size={16} /> 로그인
              </button>
            )}
          </div>
          
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-white">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-slate-900 border-b border-white/5 px-4 py-6 flex flex-col gap-4"
          >
            <a href="#about" onClick={() => setIsOpen(false)} className="text-lg font-medium">연구소 소개</a>
            <a href="#curriculum" onClick={() => setIsOpen(false)} className="text-lg font-medium">커리큘럼</a>
            <a href="#portfolio" onClick={() => setIsOpen(false)} className="text-lg font-medium">포트폴리오</a>
            <a href="#contact" onClick={() => setIsOpen(false)} className="text-lg font-medium">문의하기</a>
            <hr className="border-white/5" />
            {user ? (
              <button onClick={onLogout} className="text-brand-cyan font-bold text-left">로그아웃</button>
            ) : (
              <button onClick={onLogin} className="text-brand-cyan font-bold text-left">로그인</button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => (
  <section className="relative pt-40 pb-24 overflow-hidden hero-gradient">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-indigo/10 text-brand-indigo text-xs font-bold mb-6 border border-brand-indigo/20">
            <Star size={14} fill="currentColor" /> Gemini 공인 교육 전문가
          </div>
          <h1 className="text-5xl md:text-7xl font-serif leading-tight mb-6 text-white">
            AI와 교육의 융합,<br />
            <span className="highlight">미래를 여는 아치</span>
          </h1>
          <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-lg">
            인공지능융합교육학 석사가 제안하는 실무 중심 AI 마스터 클래스. 
            생성형 AI부터 영상 제작까지, 당신의 잠재력을 폭발시킵니다.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="#contact" className="btn-primary px-10 py-4 rounded-full">
              교육 신청하기
            </a>
            <a href="#curriculum" className="px-10 py-4 border border-white/10 rounded-full font-bold hover:bg-white/5 transition-all">
              커리큘럼 보기
            </a>
          </div>
        </motion.div>
        
        <motion.div 
          className="relative"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <div className="aspect-[4/5] bg-slate-800 rounded-t-full overflow-hidden border-4 border-white/10 shadow-2xl">
            <img 
              src="https://picsum.photos/seed/ai-education/800/1000" 
              alt="AI Education" 
              className="w-full h-full object-cover opacity-80"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 card-modern p-6 max-w-[240px]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-brand-indigo flex items-center justify-center text-white shadow-lg shadow-brand-indigo/30">
                <Award size={20} />
              </div>
              <span className="font-bold text-sm text-white">2025 베스트셀러 저자</span>
            </div>
            <p className="text-xs text-slate-400">
              'AI 하나로 광고의 신이 되는 법' 저자가 직접 강의합니다.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

const Features = () => {
  const items = [
    { icon: <Cpu />, title: "생성형 AI 실무", desc: "보고서, 기획서, PPT 제작 등 업무 효율 극대화" },
    { icon: <Globe />, title: "구글 AI 생태계", desc: "NotebookLM, AI Studio, 구글시트 AI 자동화, 데이터 분석 완벽 활용" },
    { icon: <BookOpen />, title: "AI 출판 전문가", desc: "동화책, 에세이 기획부터 출판까지 원스톱 교육" },
    { icon: <Video />, title: "AI 영상 제작", desc: "초단편 영화, 뮤직비디오, 숏폼 콘텐츠 제작" },
  ];
  
  return (
    <section id="curriculum" className="py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif mb-4 text-white">전문 교육 커리큘럼</h2>
          <p className="text-slate-400">방대한 데이터를 체계적으로 구조화한 맞춤형 교육을 제공합니다.</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map((item, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -10 }}
              className="p-8 card-modern hover:border-brand-indigo/30 transition-all"
            >
              <div className="w-14 h-14 bg-brand-indigo/10 text-brand-indigo rounded-2xl flex items-center justify-center mb-6 border border-brand-indigo/20">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Profile = () => (
  <section id="about" className="py-24 bg-slate-900/50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-16 items-center">
        <div className="lg:w-1/3">
          <div className="relative">
            <div className="aspect-square bg-slate-800 rounded-full overflow-hidden border-4 border-white/5 shadow-xl">
              <img 
                src="https://blogpfthumb-phinf.pstatic.net/MjAyNjAzMjJfMTQx/MDAxNzc0MTA2ODQ0MTY1.wz8uStpdgBampwTrA-Rx_lksxtkzaXS4un8PAQFZjOIg.8eD_g1geRCUHtBg5d-bdVYW6pjNvZUJP71JMFl4IMrwg.JPEG/KakaoTalk_20260318_154412066.jpg/KakaoTalk_20260318_154412066.jpg?type=w161" 
                alt="Representative" 
                className="w-full h-full object-cover opacity-90"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-brand-indigo rounded-full flex items-center justify-center text-white text-center p-2 text-[10px] font-bold leading-tight shadow-lg">
              인공지능융합<br />교육학 석사
            </div>
          </div>
        </div>
        
        <div className="lg:w-2/3">
          <div className="flex items-baseline gap-4 mb-2">
            <h2 className="text-4xl font-serif text-white">대표자 프로필</h2>
            <p className="text-xl font-medium text-slate-400">장지혜 대표</p>
          </div>
          <p className="highlight font-bold mb-8 italic">"AI는 도구일 뿐, 핵심은 교육적 가치의 융합입니다."</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="card-modern p-6">
              <h4 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
                <CheckCircle size={18} className="text-brand-cyan" /> 주요 이력
              </h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li>• Gemini 공인 교육 전문가</li>
                <li>• 서원대학교 디지털 칼리지 강사</li>
                <li>• 실천신학대학교대학원 AI 교수</li>
                <li>• 한국AI영상제작협회 이사</li>
                <li>• 충북여성과학기술인회 이사</li>
                <li>• KCN 뉴스 기자</li>
              </ul>
            </div>
            <div className="card-modern p-6">
              <h4 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
                <CheckCircle size={18} className="text-brand-cyan" /> 교육 실적
              </h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li>• 서울시 인재개발원 / 공무원 연수</li>
                <li>• 사회복지종사자 AI 역량 강화 교육</li>
                <li>• 초중고 디지털 리터러시 교육</li>
                <li>• 한국과학창의재단 교원 연수</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-10 p-8 card-modern">
            <h4 className="font-bold mb-6 text-white">대표 저서 및 성과</h4>
            <div className="flex flex-wrap gap-4">
              <span className="px-4 py-2 bg-white/5 rounded-lg text-xs font-medium border border-white/5 text-slate-300">
                &lt;AI 하나로 광고의 신이 되는 법&gt; (2025 베스트셀러)
              </span>
              <span className="px-4 py-2 bg-white/5 rounded-lg text-xs font-medium border border-white/5 text-slate-300">
                서울국제AI영화제 Finalist 선정
              </span>
              <span className="px-4 py-2 bg-white/5 rounded-lg text-xs font-medium border border-white/5 text-slate-300">
                돈화문 갤러리 AI 아트 전시
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const ContactForm = ({ user }) => {
  const [formData, setFormData] = useState({
    type: 'education',
    name: '',
    email: '',
    message: ''
  });
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("문의를 남기시려면 로그인이 필요합니다.");
      return;
    }
    
    setStatus('submitting');
    const path = 'inquiries';
    try {
      const inquiryData = {
        ...formData,
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp()
      };

      // 1. Save to Firestore
      await addDoc(collection(db, path), inquiryData);

      // 2. Send to Google Sheets if URL is configured
      const scriptUrl = "https://script.google.com/macros/s/AKfycbxzt4rEUt9uH9tQHJ3pPndDFw8p560nAJ21rCSlHJe-bCGiRr-W2rX-7EX_aWCaJIxH9A/exec";
      if (scriptUrl) {
        try {
          await fetch('/api/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scriptUrl,
              data: {
                ...formData,
                userEmail: user.email,
                timestamp: new Date().toLocaleString('ko-KR')
              }
            })
          });
        } catch (sheetError) {
          console.error("Google Sheets sync failed:", sheetError);
          // We don't block the UI for sheet errors if firestore succeeded
        }
      }

      setStatus('success');
      setFormData({ type: 'education', name: '', email: '', message: '' });
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error("Error submitting inquiry:", error);
      setStatus('error');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  return (
    <section id="contact" className="py-24 bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-modern p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-indigo/5 arch-shape -rotate-12 transform translate-x-20 -translate-y-20" />
          
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif mb-4 text-white">교육 문의 및 신청</h2>
            <p className="text-slate-400">궁금하신 점이나 교육 신청을 남겨주시면 빠르게 답변 드리겠습니다.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-bold mb-3 text-slate-300">문의 유형</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-brand-indigo outline-none transition-all"
                >
                  <option value="education" className="bg-slate-900">교육 신청</option>
                  <option value="product" className="bg-slate-900">상품 문의</option>
                  <option value="business" className="bg-slate-900">비즈니스 협업</option>
                  <option value="other" className="bg-slate-900">기타</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-3 text-slate-300">성함/기관명</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="홍길동 / OO초등학교"
                  className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-brand-indigo outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-3 text-slate-300">연락처/이메일</label>
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="example@email.com"
                className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-brand-indigo outline-none transition-all placeholder:text-slate-600"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-3 text-slate-300">문의 내용</label>
              <textarea 
                rows={5}
                required
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="상세한 문의 내용을 입력해주세요."
                className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-brand-indigo outline-none transition-all placeholder:text-slate-600"
              ></textarea>
            </div>
            
            <button 
              type="submit"
              disabled={status === 'submitting'}
              className={`w-full py-5 rounded-2xl font-bold transition-all ${
                status === 'success' ? 'bg-green-500 text-white' : 'btn-primary'
              }`}
            >
              {status === 'submitting' ? '전송 중...' : 
               status === 'success' ? '전송 완료!' : 
               status === 'error' ? '오류 발생 (다시 시도)' : '문의하기'}
            </button>
            
            {!user && (
              <p className="text-center text-xs text-brand-cyan font-medium">
                * 문의를 남기시려면 먼저 구글 로그인이 필요합니다.
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="bg-slate-950 text-white py-20 border-t border-white/5">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid md:grid-cols-3 gap-16 mb-16">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-brand-indigo arch-shape flex items-center justify-center text-white font-bold shadow-lg shadow-brand-indigo/20">
              K
            </div>
            <span className="font-serif text-2xl font-bold tracking-tight">
              한국AI융합교육연구소
            </span>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            인공지능과 교육의 가교 역할을 수행하며,<br />
            모두가 AI의 혜택을 누리는 세상을 꿈꿉니다.
          </p>
        </div>
        
        <div>
          <h4 className="font-bold mb-8 text-lg">Quick Links</h4>
          <ul className="space-y-4 text-sm text-slate-400">
            <li><a href="#about" className="hover:text-brand-cyan transition-colors">연구소 소개</a></li>
            <li><a href="#curriculum" className="hover:text-brand-cyan transition-colors">커리큘럼</a></li>
            <li><a href="#portfolio" className="hover:text-brand-cyan transition-colors">포트폴리오</a></li>
            <li><a href="#contact" className="hover:text-brand-cyan transition-colors">교육 문의</a></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold mb-8 text-lg">Contact Info</h4>
          <ul className="space-y-4 text-sm text-slate-400">
            <li className="flex items-center gap-3"><Mail size={18} className="text-brand-indigo" /> mychang1089@gmail.com</li>
            <li className="flex items-center gap-3"><Globe size={18} className="text-brand-indigo" /> www.k-ai.edu</li>
          </ul>
        </div>
      </div>
      
      <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-slate-500">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
          <p>© 2026 한국AI융합교육연구소. All rights reserved.</p>
          <span className="hidden md:inline text-white/10">|</span>
          <p>대표 장지혜</p>
        </div>
        <div className="flex gap-8">
          <a href="#" className="hover:text-white transition-colors">이용약관</a>
          <a href="#" className="hover:text-white font-bold transition-colors">개인정보처리방침</a>
        </div>
      </div>
    </div>
  </footer>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950">
        <div className="w-12 h-12 border-4 border-brand-indigo border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        <Navbar user={user} onLogin={handleLogin} onLogout={handleLogout} />
        
        <main>
          <Hero />
          
          <section className="py-12 bg-slate-900/50 border-y border-white/5">
            <div className="max-w-7xl mx-auto px-4 overflow-hidden">
              <div className="flex animate-marquee whitespace-nowrap gap-12 text-slate-400 font-serif text-2xl font-semibold italic tracking-widest">
                <span>Generative AI Practice</span>
                <span className="text-brand-cyan/60">•</span>
                <span>Google AI Ecosystem</span>
                <span className="text-brand-indigo/60">•</span>
                <span>AI Publishing</span>
                <span className="text-brand-cyan/60">•</span>
                <span>AI Video Production</span>
                <span className="text-brand-indigo/60">•</span>
                <span>Gemini Expert</span>
                <span className="text-brand-cyan/60">•</span>
                <span>Generative AI Practice</span>
                <span className="text-brand-cyan/60">•</span>
                <span>Google AI Ecosystem</span>
                <span className="text-brand-indigo/60">•</span>
                <span>AI Publishing</span>
                <span className="text-brand-cyan/60">•</span>
                <span>AI Video Production</span>
                <span className="text-brand-indigo/60">•</span>
                <span>Gemini Expert</span>
              </div>
            </div>
          </section>

          <Features />
          <Profile />
          {user?.email === "mychang1089@gmail.com" && <AdminDashboard user={user} />}
          
          {/* Portfolio Section Placeholder */}
          <section id="portfolio" className="py-24 bg-slate-950 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
                <div>
                  <h2 className="text-4xl font-serif mb-4 text-white">성과 및 포트폴리오</h2>
                  <p className="text-slate-400">AI 기술로 증명하는 압도적인 실적과 저서들입니다.</p>
                </div>
                <button className="flex items-center gap-2 text-brand-cyan font-bold group">
                  전체 보기 <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              
              <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
                {[
                  { title: "AI 하나로 광고의 신이 되는 법", type: "저서 / 베스트셀러", img: "https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9791194548010.jpg" },
                  { title: "나의 첫 알파벳 컬러링북", type: "AI 출판 / 교육용", img: "https://image.yes24.com/goods/165140570/XL" },
                  { title: "바람이 머무는 자리", type: "AI 시화집", img: "https://www.ehom.co.kr/news/2025/08/23/341861ce632f23c9a5ac2c65336ed3fd035022.png" }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ y: -10 }}
                    className="group cursor-pointer"
                  >
                    <div className="aspect-[3/4] rounded-2xl overflow-hidden mb-6 shadow-2xl border border-white/5">
                      <img src={item.img} alt={item.title} className="w-full h-full object-contain bg-slate-900 group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100" referrerPolicy="no-referrer" />
                    </div>
                    <span className="text-[10px] font-bold text-brand-indigo uppercase tracking-widest">{item.type}</span>
                    <h4 className="text-lg font-bold mt-2 flex items-center justify-between text-white">
                      {item.title} <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-cyan" />
                    </h4>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <ContactForm user={user} />
        </main>
        
        <Footer />
        
        {/* Floating Action Button */}
        <a 
          href="#contact" 
          className="fixed bottom-8 right-8 w-16 h-16 btn-primary text-white rounded-full flex items-center justify-center shadow-2xl z-40"
        >
          <Mail />
        </a>
        
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 30s linear infinite;
            display: flex;
            width: max-content;
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
}
