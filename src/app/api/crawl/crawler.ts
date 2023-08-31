import cheerio from "cheerio";
import { NodeHtmlMarkdown } from "node-html-markdown";
import pdf from "pdf-parse";

interface Page {
  url: string;
  content: string;
}

class Crawler {
  private seen = new Set<string>();
  private pages: Page[] = [];
  private queue: { url: string; depth: number }[] = [];

  constructor(private maxDepth = 100, private maxPages = 10000) {}

  async crawl(startUrl: string): Promise<Page[]> {
    // Add the start URL to the queue
    this.addToQueue(startUrl);

    // While there are URLs in the queue and we haven't reached the maximum number of pages...
    while (this.shouldContinueCrawling()) {
      // Dequeue the next URL and depth
      const { url, depth } = this.queue.shift()!;

      // If the depth is too great or we've already seen this URL, skip it
      if (this.isTooDeep(depth) || this.isAlreadySeen(url)) continue;

      // Add the URL to the set of seen URLs
      this.seen.add(url);

      if (url.endsWith(".pdf")) {
        const content = await this.fetchPdf(url);

        if (content && content.text) {
          // Add the pdf to the list of crawled pages
          this.pages.push({ url, content: content.text });

          // Extract new URLs from the page HTML and add them to the queue
          // this.addNewUrlsToQueue(content.links, depth);
        } else {
          console.error("PDF parsing failed or returned unexpected result");
        }
      } else {
        // Fetch the page HTML
        const html = await this.fetchPage(url);

        // Parse the HTML and add the page to the list of crawled pages
        this.pages.push({ url, content: this.parseHtml(html) });

        // Extract new URLs from the page HTML and add them to the queue
        this.addNewUrlsToQueue(this.extractUrls(html, url), depth);
      }
    }

    // Return the list of crawled pages
    return this.pages;
  }

  private isTooDeep(depth: number) {
    return depth > this.maxDepth;
  }

  private isAlreadySeen(url: string) {
    return this.seen.has(url);
  }

  private shouldContinueCrawling() {
    return this.queue.length > 0 && this.pages.length < this.maxPages;
  }

  private addToQueue(url: string, depth = 0) {
    this.queue.push({ url, depth });
  }

  private addNewUrlsToQueue(urls: string[], depth: number) {
    this.queue.push(...urls.map((url) => ({ url, depth: depth + 1 })));
  }

  private async fetchPdf(url: string): Promise<any> {
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      let pdfBuffer;

      try {
        pdfBuffer = Buffer.from(buffer);
      } catch (err) {
        console.error("Failed to convert to Buffer");
        return null;
      }
      let pdfData = await pdf(Buffer.from(pdfBuffer));

      if (!pdfData.text) {
        console.error("Unexpected pdf parse result");
        return null;
      }

      return pdfData;
    } catch (err: any) {
      console.error("Error line 84", err);
    }
  }

  private async fetchPage(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.text();
      } else {
        console.error(`Failed to fetch ${url}: ${response.statusText}`);
        return "";
      }
    } catch (error) {
      console.error(`Failed to fetch ${url}: ${error}`);
      return "";
    }
  }

  private parseHtml(html: string): string {
    try {
      const $ = cheerio.load(html);
      $("a").removeAttr("href");
      return NodeHtmlMarkdown.translate($.html());
    } catch (error) {
      console.error(`Failed to parse ${html}: ${error}`);

      return "";
    }
  }

  private extractUrls(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const relativeUrls = $("a")
      .map((_, link) => $(link).attr("href"))
      .get() as string[];
    return relativeUrls.map(
      (relativeUrl) => new URL(relativeUrl, baseUrl).href
    );
  }
}

export { Crawler };
export type { Page };
