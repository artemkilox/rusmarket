import type { CSSProperties } from 'react';

export function DesignIcon({ name }: { name: string }) {
  return <img src={`/figma/${name}.svg`} alt="" aria-hidden="true" />;
}

const crops: Record<number, CSSProperties> = {
  4: { height: '132.7%', left: '-17.19%', top: '-4.17%', width: '133.48%' },
  5: { height: '161.67%', left: '-26.52%', top: '-16.78%', width: '154.07%' },
  6: { height: '133.35%', left: '-10.6%', top: '-7.34%', width: '130%' },
  7: { height: '139.82%', left: '-14.76%', top: '-4.83%', width: '127.5%' },
};

export function Avatar({ id, name }: { id: number; name: string }) {
  return <span className="avatar" aria-hidden="true">
    {id >= 1 && id <= 8
      ? <>
          <img className="avatar-placeholder" src="/figma/imgPlaceholder.svg" alt="" />
          {id <= 7 && <img className="avatar-photo" src="/figma/imgImage.png" alt="" />}
          <img className="avatar-photo" src={`/figma/imgImage${id}.png`} alt="" style={crops[id]} />
        </>
      : name.split(' ').slice(0, 2).map((part) => part[0]).join('')}
  </span>;
}
