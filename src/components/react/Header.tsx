import { useSnowMode } from '../../App';

export default function Header() {
  const { mode, setMode } = useSnowMode();

  return (
    <header className="text-center pt-16 pb-12 relative z-10 overflow-hidden">
      {/* Mode toggle - subtle top right */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={() => setMode(mode === 'vienna' ? 'kitz' : 'vienna')}
          className={`group flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs ${
            mode === 'kitz'
              ? 'bg-slate-900/10 hover:bg-slate-900/20 border border-slate-900/20 hover:border-slate-900/30 text-slate-800'
              : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white'
          }`}
          title={mode === 'vienna' ? 'Switch to Kitzbühel mode' : 'Switch to Vienna mode'}
        >
          <span className={`transition-opacity ${mode === 'vienna' ? 'opacity-100' : 'opacity-50'}`}>
            Vienna
          </span>
          <span className={mode === 'kitz' ? 'text-slate-400' : 'text-white/30'}>|</span>
          <span className={`transition-opacity ${mode === 'kitz' ? 'opacity-100' : 'opacity-50'}`}>
            Kitzbühel
          </span>
          <span className="text-base ml-0.5">{mode === 'kitz' ? '🏔️' : '🏛️'}</span>
        </button>
      </div>
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none -z-10"
        style={{ background: 'radial-gradient(ellipse at center, rgba(23, 193, 255, 0.15) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="flex items-center justify-center gap-8 max-w-[1000px] mx-auto relative">
        {/* Left decoration */}
        <div className="hidden md:flex items-center gap-4 opacity-60">
          <div className="w-20 h-0.5 bg-gradient-to-r from-transparent to-vendure-primary" />
          <div className="w-2 h-2 bg-vendure-primary rounded-full shadow-[0_0_10px_rgba(23,193,255,0.8)] animate-pulse-dot" />
        </div>

        {/* Main content */}
        <div className="flex flex-col items-center gap-2">
          {/* Vendure Logo */}
          <div className="mb-2 animate-float">
            <svg
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 40 28"
              className="w-[60px] h-[42px] md:w-20 md:h-14 drop-shadow-[0_0_20px_rgba(23,193,255,0.6)] hover:scale-110 transition-transform duration-300"
              aria-hidden="true"
            >
              <path d="M10.746 12.685v9.263c0 .166.093.323.237.405l8.407 4.762c.302.17.671.17.973 0l8.407-4.762a.466.466 0 0 0 .237-.405v-9.263a.476.476 0 0 0-.714-.404l-7.93 4.49a.996.996 0 0 1-.973 0l-7.93-4.49a.476.476 0 0 0-.714.404Z" fill="#17c1ff"/>
              <path d="M8.893.75.486 5.51A.948.948 0 0 0 0 6.333v9.522c0 .167.092.324.237.405l8.176 4.633a.476.476 0 0 0 .714-.405v-8.982c0-.34.185-.655.487-.824l7.93-4.491a.463.463 0 0 0 0-.81L9.366.75a.48.48 0 0 0-.477 0h.003ZM30.86.74l8.407 4.76c.301.17.486.487.486.825v9.522a.47.47 0 0 1-.237.405l-8.176 4.633a.476.476 0 0 1-.714-.405v-8.982a.945.945 0 0 0-.486-.824l-7.93-4.491a.463.463 0 0 1 0-.81L30.386.742a.48.48 0 0 1 .477 0h-.003Z" fill="#17c1ff"/>
            </svg>
          </div>

          {/* Eyebrow */}
          <span className="text-xs font-semibold uppercase tracking-[4px] text-vendure-primary opacity-90 mb-1">
            Vendure Open Source
          </span>

          {/* Title - Community and Wrapped on separate lines */}
          <h1 className="font-extrabold leading-none m-0">
            <span
              className="block text-[2.5rem] md:text-[3.5rem] font-black tracking-[-2px] leading-[1.1] bg-clip-text text-transparent"
              style={{ backgroundImage: mode === 'kitz'
                ? 'linear-gradient(135deg, #1f2937 0%, #374151 100%)'
                : 'linear-gradient(135deg, #fff 0%, #a8d8ea 100%)'
              }}
            >
              Community
            </span>
            <span
              className="block text-[2.5rem] md:text-[3.5rem] font-black tracking-[-2px] leading-[1.1] bg-clip-text text-transparent animate-shimmer bg-[length:200%_auto]"
              style={{ backgroundImage: mode === 'kitz'
                ? 'linear-gradient(135deg, #0891b2 0%, #0e7490 50%, #0891b2 100%)'
                : 'linear-gradient(135deg, #17c1ff 0%, #93c5fd 50%, #17c1ff 100%)'
              }}
            >
              Wrapped
            </span>
          </h1>

          {/* Year with lines */}
          <div className="flex items-center gap-4 mt-3">
            <span className="w-10 h-px bg-gradient-to-r from-transparent via-vendure-primary/50 to-transparent" aria-hidden="true" />
            <span className="text-xl md:text-2xl font-extrabold text-vendure-primary tracking-[8px] drop-shadow-[0_0_20px_rgba(23,193,255,0.5)]">
              2025
            </span>
            <span className="w-10 h-px bg-gradient-to-r from-transparent via-vendure-primary/50 to-transparent" aria-hidden="true" />
          </div>

          <p className={`text-[1.1rem] mt-4 font-normal tracking-[0.5px] ${
            mode === 'kitz' ? 'text-slate-600' : 'text-[rgba(168,216,234,0.8)]'
          }`}>
            Celebrating the humans who pushed Vendure forward
          </p>
        </div>

        {/* Right decoration */}
        <div className="hidden md:flex items-center gap-4 opacity-60">
          <div className="w-2 h-2 bg-vendure-primary rounded-full shadow-[0_0_10px_rgba(23,193,255,0.8)] animate-pulse-dot" />
          <div className="w-20 h-0.5 bg-gradient-to-l from-transparent to-vendure-primary" />
        </div>
      </div>
    </header>
  );
}
