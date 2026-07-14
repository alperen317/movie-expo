import { useId } from 'react';
import Svg, {
  Circle,
  Defs,
  FeBlend,
  FeFlood,
  FeGaussianBlur,
  Filter,
  G,
  Line,
  LinearGradient,
  Mask,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import {
  AVATAR_VIEWBOX_SIZE,
  AvatarVariant,
  DEFAULT_AVATAR_COLORS,
  getBauhausProperties,
  getBeamProperties,
  getMarbleProperties,
  getPixelColors,
  getRingColors,
  getSunsetColors,
} from '../../lib/avatar/generate';

export interface BoringAvatarProps {
  name: string;
  variant?: AvatarVariant;
  colors?: string[];
  size?: number;
  square?: boolean;
}

export function BoringAvatar({
  name,
  variant = 'beam',
  colors = DEFAULT_AVATAR_COLORS,
  size = 40,
  square = false,
}: BoringAvatarProps) {
  switch (variant) {
    case 'marble':
      return <MarbleAvatar name={name} colors={colors} size={size} square={square} />;
    case 'beam':
      return <BeamAvatar name={name} colors={colors} size={size} square={square} />;
    case 'bauhaus':
      return <BauhausAvatar name={name} colors={colors} size={size} square={square} />;
    case 'ring':
      return <RingAvatar name={name} colors={colors} size={size} square={square} />;
    case 'pixel':
      return <PixelAvatar name={name} colors={colors} size={size} square={square} />;
    case 'sunset':
      return <SunsetAvatar name={name} colors={colors} size={size} square={square} />;
  }
}

interface VariantProps {
  name: string;
  colors: string[];
  size: number;
  square: boolean;
}

function MarbleAvatar({ name, colors, size, square }: VariantProps) {
  const viewBoxSize = AVATAR_VIEWBOX_SIZE.marble;
  const props = getMarbleProperties(name, colors);
  const maskId = useId();
  const filterId = useId();

  return (
    <Svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} width={size} height={size}>
      <Mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x={0}
        y={0}
        width={viewBoxSize}
        height={viewBoxSize}
      >
        <Rect
          width={viewBoxSize}
          height={viewBoxSize}
          rx={square ? undefined : viewBoxSize * 2}
          fill="#FFFFFF"
        />
      </Mask>
      <G mask={`url(#${maskId})`}>
        <Rect width={viewBoxSize} height={viewBoxSize} fill={props[0].color} />
        <Path
          filter={`url(#${filterId})`}
          d="M32.414 59.35L50.376 70.5H72.5v-71H33.728L26.5 13.381l19.057 27.08L32.414 59.35z"
          fill={props[1].color}
          transform={`translate(${props[1].translateX} ${props[1].translateY}) rotate(${props[1].rotate} ${viewBoxSize / 2} ${viewBoxSize / 2}) scale(${props[2].scale})`}
        />
        <Path
          filter={`url(#${filterId})`}
          d="M22.216 24L0 46.75l14.108 38.129L78 86l-3.081-59.276-22.378 4.005 12.972 20.186-23.35 27.395L22.215 24z"
          fill={props[2].color}
          transform={`translate(${props[2].translateX} ${props[2].translateY}) rotate(${props[2].rotate} ${viewBoxSize / 2} ${viewBoxSize / 2}) scale(${props[2].scale})`}
        />
      </G>
      <Defs>
        <Filter id={filterId} filterUnits="userSpaceOnUse">
          <FeFlood floodOpacity={0} result="BackgroundImageFix" />
          <FeBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <FeGaussianBlur stdDeviation={7} result="effect1_foregroundBlur" />
        </Filter>
      </Defs>
    </Svg>
  );
}

function BeamAvatar({ name, colors, size, square }: VariantProps) {
  const viewBoxSize = AVATAR_VIEWBOX_SIZE.beam;
  const props = getBeamProperties(name, colors);
  const maskId = useId();

  return (
    <Svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} width={size} height={size}>
      <Mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x={0}
        y={0}
        width={viewBoxSize}
        height={viewBoxSize}
      >
        <Rect
          width={viewBoxSize}
          height={viewBoxSize}
          rx={square ? undefined : viewBoxSize * 2}
          fill="#FFFFFF"
        />
      </Mask>
      <G mask={`url(#${maskId})`}>
        <Rect width={viewBoxSize} height={viewBoxSize} fill={props.backgroundColor} />
        <Rect
          x={0}
          y={0}
          width={viewBoxSize}
          height={viewBoxSize}
          transform={`translate(${props.wrapperTranslateX} ${props.wrapperTranslateY}) rotate(${props.wrapperRotate} ${viewBoxSize / 2} ${viewBoxSize / 2}) scale(${props.wrapperScale})`}
          fill={props.wrapperColor}
          rx={props.isCircle ? viewBoxSize : viewBoxSize / 6}
        />
        <G
          transform={`translate(${props.faceTranslateX} ${props.faceTranslateY}) rotate(${props.faceRotate} ${viewBoxSize / 2} ${viewBoxSize / 2})`}
        >
          {props.isMouthOpen ? (
            <Path
              d={`M15 ${19 + props.mouthSpread}c2 1 4 1 6 0`}
              stroke={props.faceColor}
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            <Path d={`M13,${19 + props.mouthSpread} a1,0.75 0 0,0 10,0`} fill={props.faceColor} />
          )}
          <Rect
            x={14 - props.eyeSpread}
            y={14}
            width={1.5}
            height={2}
            rx={1}
            stroke="none"
            fill={props.faceColor}
          />
          <Rect
            x={20 + props.eyeSpread}
            y={14}
            width={1.5}
            height={2}
            rx={1}
            stroke="none"
            fill={props.faceColor}
          />
        </G>
      </G>
    </Svg>
  );
}

function BauhausAvatar({ name, colors, size, square }: VariantProps) {
  const viewBoxSize = AVATAR_VIEWBOX_SIZE.bauhaus;
  const props = getBauhausProperties(name, colors);
  const maskId = useId();

  return (
    <Svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} width={size} height={size}>
      <Mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x={0}
        y={0}
        width={viewBoxSize}
        height={viewBoxSize}
      >
        <Rect
          width={viewBoxSize}
          height={viewBoxSize}
          rx={square ? undefined : viewBoxSize * 2}
          fill="#FFFFFF"
        />
      </Mask>
      <G mask={`url(#${maskId})`}>
        <Rect width={viewBoxSize} height={viewBoxSize} fill={props[0].color} />
        <Rect
          x={10}
          y={30}
          width={viewBoxSize}
          height={props[1].isSquare ? viewBoxSize : viewBoxSize / 8}
          fill={props[1].color}
          transform={`translate(${props[1].translateX} ${props[1].translateY}) rotate(${props[1].rotate} ${viewBoxSize / 2} ${viewBoxSize / 2})`}
        />
        <Circle
          cx={viewBoxSize / 2}
          cy={viewBoxSize / 2}
          fill={props[2].color}
          r={viewBoxSize / 5}
          transform={`translate(${props[2].translateX} ${props[2].translateY})`}
        />
        <Line
          x1={0}
          y1={viewBoxSize / 2}
          x2={viewBoxSize}
          y2={viewBoxSize / 2}
          strokeWidth={2}
          stroke={props[3].color}
          transform={`translate(${props[3].translateX} ${props[3].translateY}) rotate(${props[3].rotate} ${viewBoxSize / 2} ${viewBoxSize / 2})`}
        />
      </G>
    </Svg>
  );
}

const RING_PATHS = [
  'M0 0h90v45H0z',
  'M0 45h90v45H0z',
  'M83 45a38 38 0 00-76 0h76z',
  'M83 45a38 38 0 01-76 0h76z',
  'M77 45a32 32 0 10-64 0h64z',
  'M77 45a32 32 0 11-64 0h64z',
  'M71 45a26 26 0 00-52 0h52z',
  'M71 45a26 26 0 01-52 0h52z',
];

function RingAvatar({ name, colors, size, square }: VariantProps) {
  const viewBoxSize = AVATAR_VIEWBOX_SIZE.ring;
  const ringColors = getRingColors(name, colors);
  const maskId = useId();

  return (
    <Svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} width={size} height={size}>
      <Mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x={0}
        y={0}
        width={viewBoxSize}
        height={viewBoxSize}
      >
        <Rect
          width={viewBoxSize}
          height={viewBoxSize}
          rx={square ? undefined : viewBoxSize * 2}
          fill="#FFFFFF"
        />
      </Mask>
      <G mask={`url(#${maskId})`}>
        {RING_PATHS.map((d, i) => (
          <Path key={d} d={d} fill={ringColors[i]} />
        ))}
        <Circle cx={45} cy={45} r={23} fill={ringColors[8]} />
      </G>
    </Svg>
  );
}

const PIXEL_POSITIONS: { x: number; y: number }[] = (() => {
  const columns = [0, 20, 40, 60, 10, 30, 50, 70];
  const rows = [0, 10, 20, 30, 40, 50, 60, 70];
  const positions: { x: number; y: number }[] = [];
  for (const x of columns) positions.push({ x, y: 0 });
  for (const y of rows.slice(1)) {
    for (const x of [20, 40, 60, 10, 30, 50, 70]) positions.push({ x, y });
  }
  return positions;
})();

function PixelAvatar({ name, colors, size, square }: VariantProps) {
  const viewBoxSize = AVATAR_VIEWBOX_SIZE.pixel;
  const pixelColors = getPixelColors(name, colors);
  const maskId = useId();

  return (
    <Svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} width={size} height={size}>
      <Mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        maskType="alpha"
        x={0}
        y={0}
        width={viewBoxSize}
        height={viewBoxSize}
      >
        <Rect
          width={viewBoxSize}
          height={viewBoxSize}
          rx={square ? undefined : viewBoxSize * 2}
          fill="#FFFFFF"
        />
      </Mask>
      <G mask={`url(#${maskId})`}>
        {PIXEL_POSITIONS.map((pos, i) => (
          <Rect
            key={`${pos.x}-${pos.y}`}
            x={pos.x}
            y={pos.y}
            width={10}
            height={10}
            fill={pixelColors[i]}
          />
        ))}
      </G>
    </Svg>
  );
}

function SunsetAvatar({ name, colors, size, square }: VariantProps) {
  const viewBoxSize = AVATAR_VIEWBOX_SIZE.sunset;
  const sunsetColors = getSunsetColors(name, colors);
  const maskId = useId();
  const gradientTopId = useId();
  const gradientBottomId = useId();

  return (
    <Svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} width={size} height={size}>
      <Mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x={0}
        y={0}
        width={viewBoxSize}
        height={viewBoxSize}
      >
        <Rect
          width={viewBoxSize}
          height={viewBoxSize}
          rx={square ? undefined : viewBoxSize * 2}
          fill="#FFFFFF"
        />
      </Mask>
      <G mask={`url(#${maskId})`}>
        <Path fill={`url(#${gradientTopId})`} d={`M0 0h${viewBoxSize}v${viewBoxSize / 2}H0z`} />
        <Path
          fill={`url(#${gradientBottomId})`}
          d={`M0 ${viewBoxSize / 2}h${viewBoxSize}v${viewBoxSize / 2}H0z`}
        />
      </G>
      <Defs>
        <LinearGradient
          id={gradientTopId}
          x1={viewBoxSize / 2}
          y1={0}
          x2={viewBoxSize / 2}
          y2={viewBoxSize / 2}
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor={sunsetColors[0]} />
          <Stop offset={1} stopColor={sunsetColors[1]} />
        </LinearGradient>
        <LinearGradient
          id={gradientBottomId}
          x1={viewBoxSize / 2}
          y1={viewBoxSize / 2}
          x2={viewBoxSize / 2}
          y2={viewBoxSize}
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor={sunsetColors[2]} />
          <Stop offset={1} stopColor={sunsetColors[3]} />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}
