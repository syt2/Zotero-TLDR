import { tldrs } from "./dataStorage";

type SemanticScholarItemInfo = {
  title?: string;
  abstract?: string;
  tldr?: string;
};

export class TLDRFetcher {
  private readonly zoteroItem: Zotero.Item;
  private readonly title?: string;
  private readonly abstract?: string;

  constructor(item: Zotero.Item) {
    this.zoteroItem = item;
    if (item.isRegularItem()) {
      this.title = item.getField("title") as string;
      this.abstract = item.getField("abstractNote") as string;
    }
  }

  async fetchTLDR() {
    if (!this.title || this.title.length <= 0) {
      return false;
    }
    const noteKey = (await tldrs.getAsync())[this.zoteroItem.key];
    try {
      const infos = await this.fetchRelevanceItemInfos(this.title);
      for (const info of infos) {
        let match = false;
        if (info.title && this.title && this.checkLCS(info.title, this.title)) {
          match = true;
        } else if (
          info.abstract &&
          this.abstract &&
          this.checkLCS(info.abstract, this.abstract)
        ) {
          match = true;
        }
        if (match && info.tldr) {
          let note = new Zotero.Item("note");
          if (noteKey) {
            const obj = Zotero.Items.getByLibraryAndKey(
              this.zoteroItem.libraryID,
              noteKey,
            );
            if (
              obj &&
              obj instanceof Zotero.Item &&
              this.zoteroItem.getNotes().includes(obj.id)
            ) {
              note = obj;
            }
          }
          note.setNote(`<p>TL;DR</p>\n<p>${info.tldr}</p>`);
          note.parentID = this.zoteroItem.id;
          await note.saveTx();
          await tldrs.modify((data: any) => {
            data[this.zoteroItem.key] = note.key;
            return data;
          });
          return true;
        }
      }
      await tldrs.modify((data: any) => {
        data[this.zoteroItem.key] = false;
        return data;
      });
    } catch (error) {
      Zotero.log(`post semantic scholar request error: ${error}`);
    }
  }

  private async fetchRelevanceItemInfos(
    title: string,
  ): Promise<SemanticScholarItemInfo[]> {
    const semanticScholarURL = "https://www.semanticscholar.org/api/1/search";
    const params = {
      queryString: title,
      page: 1,
      pageSize: 10,
      sort: "relevance",
      authors: [],
      coAuthors: [],
      venues: [],
      performTitleMatch: true,
      requireViewablePdf: false,
      includeTldrs: true,
    };
    const resp = await Zotero.HTTP.request("POST", semanticScholarURL, {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (resp.status === 200) {
      const results = JSON.parse(resp.response).results;
      return results.map((item: any) => {
        const result = {
          title: item.title.text,
          abstract: item.paperAbstract.text,
          tldr: undefined,
        };
        if (item.tldr) {
          result.tldr = item.tldr.text;
        }
        return result;
      });
    }
    return [];
  }

  private checkLCS(pattern: string, content: string): boolean {
    const LCS = StringMatchUtils.longestCommonSubsequence(pattern, content);
    return LCS.length >= Math.max(pattern.length, content.length) * 0.9;
  }
}

class StringMatchUtils {
  static longestCommonSubsequence(text1: string, text2: string): string {
    const m = text1.length;
    const n = text2.length;

    const dp: number[][] = new Array(m + 1);
    for (let i = 0; i <= m; i++) {
      dp[i] = new Array(n + 1).fill(0);
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (text1[i - 1] === text2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    let i = m,
      j = n;
    const lcs: string[] = [];
    while (i > 0 && j > 0) {
      if (text1[i - 1] === text2[j - 1]) {
        lcs.unshift(text1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs.join("");
  }

  // static minWindow(s: string, t: string): [number, number] | null {
  //     const m = s.length, n = t.length
  //     let start = -1, minLen = Number.MAX_SAFE_INTEGER, i = 0, j = 0, end;
  //     while (i < m) {
  //         if (s[i] == t[j]) {
  //             if (++j == n) {
  //                 end = i + 1;
  //                 while (--j >= 0) {
  //                     while (s[i--] != t[j]);
  //                 }
  //                 ++i; ++j;
  //                 if (end - i < minLen) {
  //                     minLen = end - i;
  //                     start = i;
  //                 }
  //             }
  //         }
  //         ++i;
  //     }
  //     return start == -1 ? null : [start, minLen];
  // }
}
