import { cn } from "@/lib/utils"
import { marked } from "marked"
import {
  Fragment,
  cloneElement,
  isValidElement,
  memo,
  useId,
  useMemo,
  type ReactElement,
  type ReactNode,
} from "react"
import ReactMarkdown, { Components } from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import { CodeBlock, CodeBlockCode } from "./code-block"
import { PlatformIcon } from "./platform-icon"
import type { PlatformId } from "@/lib/platforms"

export type MarkdownProps = {
  children: string
  id?: string
  className?: string
  components?: Partial<Components>
}

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown)
  return tokens.map((token) => token.raw)
}

function extractLanguage(className?: string): string {
  if (!className) return "plaintext"
  const match = className.match(/language-(\w+)/)
  return match ? match[1] : "plaintext"
}

const SHORTCODE_RE = /:(x|linkedin|li|youtube|yt|instagram|ig|tiktok|tt):/gi

const SHORTCODE_TO_PLATFORM: Record<string, PlatformId> = {
  x: "x",
  linkedin: "linkedin",
  li: "linkedin",
  youtube: "youtube",
  yt: "youtube",
  instagram: "instagram",
  ig: "instagram",
  tiktok: "tiktok",
  tt: "tiktok",
}

function transformString(text: string): ReactNode {
  SHORTCODE_RE.lastIndex = 0
  let match: RegExpExecArray | null
  const parts: ReactNode[] = []
  let last = 0
  while ((match = SHORTCODE_RE.exec(text)) !== null) {
    const platform = SHORTCODE_TO_PLATFORM[match[1].toLowerCase()]
    if (!platform) continue
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push(
      <PlatformIcon
        key={`${match.index}-${match[1]}`}
        platform={platform}
        className="inline-block size-[1em] align-[-0.15em] mx-0.5 fill-current"
      />,
    )
    last = match.index + match[0].length
  }
  if (last === 0) return text
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

function transformShortcodes(node: ReactNode): ReactNode {
  if (node == null || typeof node === "boolean") return node
  if (typeof node === "string") return transformString(node)
  if (typeof node === "number") return node
  if (Array.isArray(node)) {
    return node.map((child, i) => (
      <Fragment key={i}>{transformShortcodes(child)}</Fragment>
    ))
  }
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>
    if (el.type === "code" || el.type === "pre") return el
    const children = el.props?.children
    if (children == null) return el
    return cloneElement(el, el.props, transformShortcodes(children))
  }
  return node
}

type MdProps = {
  children?: ReactNode
  node?: unknown
} & Record<string, unknown>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mkShortcodeRenderer(Tag: keyof React.JSX.IntrinsicElements): any {
  function Renderer({ children, node, ...rest }: MdProps) {
    void node
    return (
      <Tag {...(rest as Record<string, unknown>)}>
        {transformShortcodes(children)}
      </Tag>
    )
  }
  Renderer.displayName = `Md_${Tag}`
  return Renderer
}

const INITIAL_COMPONENTS: Partial<Components> = {
  p: mkShortcodeRenderer("p"),
  li: mkShortcodeRenderer("li"),
  h1: mkShortcodeRenderer("h1"),
  h2: mkShortcodeRenderer("h2"),
  h3: mkShortcodeRenderer("h3"),
  h4: mkShortcodeRenderer("h4"),
  h5: mkShortcodeRenderer("h5"),
  h6: mkShortcodeRenderer("h6"),
  blockquote: mkShortcodeRenderer("blockquote"),
  td: mkShortcodeRenderer("td"),
  th: mkShortcodeRenderer("th"),
  code: function CodeComponent({ className, children, ...props }) {
    const isInline =
      !props.node?.position?.start.line ||
      props.node?.position?.start.line === props.node?.position?.end.line

    if (isInline) {
      return (
        <span
          className={cn(
            "bg-primary-foreground rounded-sm px-1 font-mono text-sm",
            className
          )}
          {...props}
        >
          {children}
        </span>
      )
    }

    const language = extractLanguage(className)

    return (
      <CodeBlock className={className}>
        <CodeBlockCode code={children as string} language={language} />
      </CodeBlock>
    )
  },
  pre: function PreComponent({ children }) {
    return <>{children}</>
  },
}

const MemoizedMarkdownBlock = memo(
  function MarkdownBlock({
    content,
    components = INITIAL_COMPONENTS,
  }: {
    content: string
    components?: Partial<Components>
  }) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    )
  },
  function propsAreEqual(prevProps, nextProps) {
    return prevProps.content === nextProps.content
  }
)

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock"

function MarkdownComponent({
  children,
  id,
  className,
  components = INITIAL_COMPONENTS,
}: MarkdownProps) {
  const generatedId = useId()
  const blockId = id ?? generatedId
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children])

  return (
    <div className={className}>
      {blocks.map((block, index) => (
        <MemoizedMarkdownBlock
          key={`${blockId}-block-${index}`}
          content={block}
          components={components}
        />
      ))}
    </div>
  )
}

const Markdown = memo(MarkdownComponent)
Markdown.displayName = "Markdown"

export { Markdown }
