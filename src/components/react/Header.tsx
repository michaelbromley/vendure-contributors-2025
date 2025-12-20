export default function Header() {
  return (
    <header className="relative py-12 md:py-20 text-center overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-radial from-vendure-primary/10 via-transparent to-transparent opacity-50" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4">
        {/* Vendure Logo */}
        <div className="flex justify-center mb-4">
          <svg 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 40 28" 
            className="w-14 h-10 md:w-16 md:h-12"
            aria-hidden="true"
          >
            <path d="M10.746 12.685v9.263c0 .166.093.323.237.405l8.407 4.762c.302.17.671.17.973 0l8.407-4.762a.466.466 0 0 0 .237-.405v-9.263a.476.476 0 0 0-.714-.404l-7.93 4.49a.996.996 0 0 1-.973 0l-7.93-4.49a.476.476 0 0 0-.714.404Z" fill="#17c1ff"/>
            <path d="M8.893.75.486 5.51A.948.948 0 0 0 0 6.333v9.522c0 .167.092.324.237.405l8.176 4.633a.476.476 0 0 0 .714-.405v-8.982c0-.34.185-.655.487-.824l7.93-4.491a.463.463 0 0 0 0-.81L9.366.75a.48.48 0 0 0-.477 0h.003ZM30.86.74l8.407 4.76c.301.17.486.487.486.825v9.522a.47.47 0 0 1-.237.405l-8.176 4.633a.476.476 0 0 1-.714-.405v-8.982a.945.945 0 0 0-.486-.824l-7.93-4.491a.463.463 0 0 1 0-.81L30.386.742a.48.48 0 0 1 .477 0h-.003Z" fill="#17c1ff"/>
          </svg>
        </div>
        
        {/* Eyebrow */}
        <p className="text-vendure-primary/80 text-xs md:text-sm tracking-[0.2em] uppercase mb-1">
          Vendure Open Source
        </p>
        
        {/* Title - Community Wrapped on same line */}
        <h1 className="mb-2">
          <span 
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold italic leading-tight bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(180deg, #17c1ff 0%, #93c5fd 50%, #60a5fa 100%)' }}
          >
            Community Wrapped
          </span>
        </h1>
        
        {/* Year with lines */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="h-px w-12 md:w-20 bg-gradient-to-r from-transparent to-vendure-primary/60" aria-hidden="true" />
          <span className="text-2xl md:text-3xl font-bold text-vendure-primary tracking-wider">
            2025
          </span>
          <span className="h-px w-12 md:w-20 bg-gradient-to-l from-transparent to-vendure-primary/60" aria-hidden="true" />
        </div>
        
        <p className="text-text-secondary text-base md:text-lg max-w-xl mx-auto">
          Celebrating the humans who pushed Vendure forward
        </p>
      </div>
    </header>
  );
}
