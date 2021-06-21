import { TextDocumentContentProvider, Uri, window, workspace } from 'vscode';

export class DocumentContentProvider implements TextDocumentContentProvider {
    public static readonly scheme = 'docfxPreview';
    private sourceUri: Uri;

    public content: string;
    public header: string;

    public provideTextDocumentContent(): Thenable<string> {
        const editor = window.activeTextEditor;
        this.sourceUri = editor.document.uri;

        return workspace.openTextDocument(this.sourceUri).then(document => {
            return this.buildHtmlFromContent();
        });
    }

    private buildHtmlFromContent(): string {
        let result = `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="stylesheet" href="http://localhost:8080/styles/b322764f.site-ltr.css">
            <link rel="stylesheet" href="http://localhost:8080/styles/a421c492.reference.css">
            <script>
                var msDocs = {
                    data: {
                        timeOrigin: Date.now(),
                        contentLocale: 'en-us',
                        contentDir: 'ltr',
                        userLocale: 'en-us',
                        userDir: 'ltr',
                        pageTemplate: 'Reference',
                        brand: '',
                        context: {

                        },
                        hasBinaryRating: true,
                        hasGithubIssues: true,
                        showFeedbackReport: false,
                        enableTutorialFeedback: false,
                        feedbackSystem: 'GitHub',
                        feedbackGitHubRepo: 'MicrosoftDocs/office-docs-powershell',
                        feedbackProductUrl: 'https://github.com/MicrosoftDocs/office-docs-powershell/issues',
                        contentGitUrl: 'https://github.com/MicrosoftDocs/office-docs-powershell/blob/master/sharepoint/sharepoint-ps/sharepoint-online/Add-SPOTenantCdnOrigin.md',
                        extendBreadcrumb: true,
                        isEditDisplayable: true,
                        hideViewSource: false,
                        hasPageActions: true,
                        hasBookmark: true,
                        hasShare: true
                    },
                    functions:{}
                };
            </script>
            <script nomodule src="https://docs.microsoft.com/static/third-party/bluebird/3.5.0/bluebird.min.js" integrity="sha384-aD4BDeDGeLXLpPK4yKeqtZQa9dv4a/7mQ+4L5vwshIYH1Mc2BrXvHd32iHzYCQy5" crossorigin="anonymous"></script>
            <script nomodule src="https://docs.microsoft.com/static/third-party/fetch/3.0.0/fetch.umd.min.js" integrity="sha384-EQIXrC5K2+7X8nGgLkB995I0/6jfAvvyG1ieZ+WYGxgJHFMD/alsG9fSDWvzb5Y1" crossorigin="anonymous"></script>
            <script nomodule src="https://docs.microsoft.com/static/third-party/template/1.4.0/template.min.js" integrity="sha384-1zKzI6ldTVHMU7n0W2HpE/lhHI+UG4D9IIaxbj3kT2UhCWicdTuJkTtnKuu0CQzN" crossorigin="anonymous"></script>
            <script nomodule src="https://docs.microsoft.com/static/third-party/url/0.5.7/url.min.js" integrity="sha384-vn7xBMtpSTfzaTRWxj0kVq0UcsbBrTOgZ/M1ISHqe1V358elYva+lfiEC+T8jLPc" crossorigin="anonymous"></script>
            <script src="http://localhost:8080/scripts/49757a8e.index-polyfills.js"></script>
            <script src="http://localhost:8080/scripts/b45749a1.index-docs.js"></script>
        </head>
        <body>
            <div class="mainContainer  uhf-container has-top-padding  has-default-focus" data-bi-name="body">
                <div id="main-column" class="column  is-full is-four-fifths-desktop ">
                    <main id="main" role="main" class="content " data-bi-name="content" lang="en-us" dir="ltr">
                    ${this.header}`;
        if (this.header) {
            result +=
                `<ul class="metadata page-metadata" data-bi-name="page info" lang="en-us" dir="ltr">
                        <li>
                            <time class="is-invisible" data-article-date aria-label="Article review date"
                                datetime="2020-09-30T07:42:05.419Z" data-article-date-source="git">9/30/2020</time>
                        </li>
                        <li class="readingTime">2 minutes to read</li>
                        <li class="contributors-holder">
                            <a href="https://github.com/928PJY/ValidationTest/blob/jiayin-preview-test/test.md" title="1 Contributor"
                                aria-label="1 Contributor">
                                <ul class="contributors" data-bi-name="contributors" aria-hidden="true">
                                    <li><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNMsAcAAQUAoVnxsV8AAAAASUVORK5CYII="
                                            data-src="https://github.com/928PJY.png?size=32" role="presentation" /></li>
                                </ul>
                            </a>
                        </li>
                    </ul>`;
        }
        result +=
            `${this.content}
                    </main>
                </div>
            </div>
        </body>
        </html>`;
        return result;
    }
}
