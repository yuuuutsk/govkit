// 通知書本体の型
export interface Document {
  docNo: string;
  date: string;
  author: {
    name: string;
    aff: string;
  };
  title: string;
  mainText: string[];
  appendix: Appendix[];
  mainText2: string[];
  appendix2: Appendix[];
  mainText3: string[];
}

export interface Appendix {
  docLink: string;
  appTitle: string;
}

// 増減内訳書の型
export interface ZougenUchiwakeSho {
  header: {
    jigyoshoName: string;
    jigyoshoNum: string;
    jigyoshoSeiriKigo: string;
    jinInNum: string;
    nenkinJimusho2: string;
    nouhuMokutekiMonth: string;
    nouhuMokutekiYear: string;
    nouhuMokutekiYearGengou: string;
    oshirase: string;
  };
  kojinbetsuUchiwake: KojinbetsuUchiwake[];
  shukei: Shukei[];
}

export interface KojinbetsuUchiwake {
  shimei: string;
  shoriYMD: string;
  todokeshoCode: string;
  kenKouHokenRyou: HokenRyou;
  kouseiNenkinHokenRyou: HokenRyou;
}

export interface HokenRyou {
  hongetsuGaku: string;
  zengetsuIzenKingaku: string;
}

export interface Shukei {
  goukei: string;
  kenKouHokenRyou: HokenRyou;
  kouseiNenkinHokenRyou: HokenRyou;
}

// CSV データの型
export interface CSVData {
  filename: string;
  headers: string[];
  rows: string[][];
}

// テンプレート用データ
export interface TemplateData {
  documents: Document[];
  zougens: ZougenUchiwakeSho[];
  csvs: CSVData[];
}

// File System Access API の型
declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  }

  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemHandle>;
  }

  interface DataTransferItem {
    getAsFileSystemHandle(): Promise<FileSystemHandle | null>;
  }
}

export {};
