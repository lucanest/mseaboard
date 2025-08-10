export function TitleFlip({ text, colors}) {
  return (
    <div className="flex items-center justify-start w-full gap-0">
      {text.split('').map((ch, i) => {
        const color = colors[ch] || 'bg-gray-200';
        return (
          <div key={i} className="flip-card w-16 h-16">
            <div
              className="flip-inner h-full w-full animate-tileFlip"
              style={{
                animation: 'tileFlip 650ms ease-out forwards',
                animationDelay: `${i * 80}ms`
              }}
            >
              <span className={`flip-face flip-front ${color} block w-full h-full rounded-none`} />
              <span className={`flip-face flip-back ${color} block w-full h-full flex items-center justify-center text-5xl font-bold leading-none`}>
                {ch}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}