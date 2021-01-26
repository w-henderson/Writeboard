interface Clipboard {
  read(): Promise<ClipboardItem[]>;
  write(data: ClipboardItem[]): Promise<void>;
}

type ClipboardItemDelayedCallback = () => Promise<string | Blob>;
type ClipboardItemData = any;

declare class ClipboardItem {
  constructor(items: Record<string, ClipboardItemData>, options?: ClipboardItemOptions);
  static createDelayed(items: Record<string, ClipboardItemData>, options?: ClipboardItemOptions): ClipboardItem;

  readonly presentationStyle: PresentationStyle;
  readonly lastModified: number;
  readonly delayed: boolean;
  readonly types: readonly string[];

  getType(type: string): Promise<Blob>;
}

type PresentationStyle = "unspecified" | "inline" | "attachment";

interface ClipboardItemOptions {
  presentationStyle?: PresentationStyle;
}