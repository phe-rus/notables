import { useMediaSource } from "@notables/pluraliti";
import { type ReactNode, useId } from "react";
import { PANEL_BORDER } from "../lib/render-scene";
import { bubbleShape, bubbleText, fontFamilies, sceneStrokePath } from "../lib/scene-geometry";
import type {
  BubbleItem,
  PageScene,
  PictureItem,
  SceneItem,
  StrokeItem,
} from "../model/page-scene";

/**
 * The page as SVG, matching what `renderScene` paints. Children are drawn
 * on top, for selection handles.
 */
export function SceneView({
  scene,
  live,
  children,
}: {
  scene: PageScene;
  /** A stroke still being drawn. */
  live?: StrokeItem | null;
  children?: ReactNode;
}) {
  const clipBase = useId().replace(/:/g, "");
  const clip = (panel: string | null) => (panel ? `url(#${clipBase}-${panel})` : undefined);

  return (
    <>
      <defs>
        {scene.panels.map((panel) => (
          <clipPath key={panel.id} id={`${clipBase}-${panel.id}`}>
            <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} />
          </clipPath>
        ))}
      </defs>
      <rect width={scene.width} height={scene.height} fill={scene.paper} />
      {scene.items.map((item) => (
        <SceneItemView key={item.id} item={item} clip={clip} />
      ))}
      {live && <StrokeView stroke={live} clip={clip(live.panel)} live />}
      {scene.panels.map((panel) => (
        <rect
          key={panel.id}
          x={panel.x}
          y={panel.y}
          width={panel.w}
          height={panel.h}
          fill="none"
          stroke="#141210"
          strokeWidth={PANEL_BORDER}
        />
      ))}
      {children}
    </>
  );
}

function SceneItemView({
  item,
  clip,
}: {
  item: SceneItem;
  clip: (panel: string | null) => string | undefined;
}) {
  if (item.type === "stroke") return <StrokeView stroke={item} clip={clip(item.panel)} />;
  if (item.type === "picture") return <PictureView picture={item} clip={clip(item.panel)} />;
  return <BubbleView bubble={item} />;
}

function StrokeView({ stroke, clip, live }: { stroke: StrokeItem; clip?: string; live?: boolean }) {
  return (
    <g clipPath={clip}>
      <path
        d={sceneStrokePath(stroke, live)}
        fill={stroke.color}
        fillOpacity={stroke.tool === "marker" ? 0.45 : 1}
      />
    </g>
  );
}

function PictureView({ picture, clip }: { picture: PictureItem; clip?: string }) {
  const href = useMediaSource(picture.src);
  if (!href) return null;
  return (
    <g clipPath={clip}>
      <image
        href={href}
        x={picture.x}
        y={picture.y}
        width={picture.w}
        height={picture.h}
        preserveAspectRatio="none"
      />
    </g>
  );
}

export function BubbleView({ bubble }: { bubble: BubbleItem }) {
  const shape = bubbleShape(bubble);
  const text = bubbleText(bubble);
  const bold = bubble.style === "shout" || bubble.style === "text";
  return (
    <g>
      {shape && (
        <>
          {shape.paths.map((d) => (
            <path
              key={`o${d}`}
              d={d}
              fill="none"
              stroke="#141210"
              strokeWidth={shape.outline * 2}
              strokeLinejoin="round"
            />
          ))}
          {shape.paths.map((d) => (
            <path key={`f${d}`} d={d} fill={shape.fill} />
          ))}
        </>
      )}
      <text
        fill="#141210"
        fontFamily={fontFamilies[bubble.font]}
        fontSize={bubble.fontSize}
        fontWeight={bold ? 700 : 400}
        textAnchor={text.align === "center" ? "middle" : "start"}
      >
        {text.lines.map((line, index) => (
          <tspan key={index} x={text.x} y={text.firstBaseline + index * text.lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}
