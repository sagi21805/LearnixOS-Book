use std::{io, process};

use mdbook_preprocessor::{
    Preprocessor, PreprocessorContext, book::Book, errors::Error,
};
use regex::Regex;
use toml::value::Table;

pub struct GithubRepositoryCard;

static HTML: &str = r##"
<div class="github-repo-box" data-repo="{username}/{repository}">
  <div class="repo-header">
    <div class="repo-title-group">
      <svg aria-hidden="true" height="18" viewBox="0 0 16 16" version="1.1" width="18" class="icon" fill="currentColor">
        <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path>
      </svg>
      <a class="repo-title-link" href="#" target="_blank" rel="noopener noreferrer">
        <span class="repo-title-text">Loading repository...</span>
      </a>
    </div>
    <div class="repo-actions">
    {patreon}<a class="github-btn btn-sponsor" href="#" target="_blank" rel="noopener noreferrer">
        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="icon"><path fill="#bf3989" d="m8 14.25.345.666a.75.75 0 0 1-.69 0l-.008-.004-.018-.01a7.152 7.152 0 0 1-.31-.17 22.055 22.055 0 0 1-3.434-2.414C2.045 10.731 0 8.35 0 5.5 0 2.836 2.086 1 4.25 1 5.797 1 7.153 1.802 8 3.02 8.847 1.802 10.203 1 11.75 1 13.914 1 16 2.836 16 5.5c0 2.85-2.045 5.231-3.885 6.818a22.066 22.066 0 0 1-3.744 2.584l-.018.01-.006.003h-.002Z"></path></svg>
        Sponsor
      </a>
      <a class="github-btn btn-star" href="#" target="_blank" rel="noopener noreferrer">
        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="icon"><path fill="#e3b341" d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path></svg>
        Star
      </a>
      <a class="github-btn btn-comment" href="#" onclick="window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'}); return false;">
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="icon" fill="currentColor">
          <path fill-rule="evenodd" d="M1.75 1h12.5c.966 0 1.75.784 1.75 1.75v9.5A1.75 1.75 0 0 1 14.25 14H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 15.543V14H1.75A1.75 1.75 0 0 1 0 12.25v-9.5C0 1.784.784 1 1.75 1Z M3.5 4.25h9v1.1h-9Z M3.5 6.95h9v1.1h-9Z M3.5 9.65h6v1.1h-6Z"></path>
      </svg>
          Comment
      </a>
    </div>
  </div>
  <div class="repo-body">
    <p class="repo-description">Connecting to GitHub API...</p>
  </div>
  <div class="repo-footer">
    <span class="stat-item repo-language" style="display: none;">
      <span class="language-color"></span>
      <span class="repo-language-text">Language</span>
    </span>
    <a class="stat-item link-stars" href="#" target="_blank" rel="noopener noreferrer">
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="icon"><path fill="currentColor" d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path></svg>
      <span class="repo-stars-count">0</span>
    </a>
    <a class="stat-item link-forks" href="#" target="_blank" rel="noopener noreferrer">
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="icon"><path fill="currentColor" d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"></path></svg>
      <span class="repo-forks-count">0</span>
    </a>
    <a class="stat-item link-commits" href="#" target="_blank" rel="noopener noreferrer">
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="icon"><path fill="currentColor" d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5h-3.32Zm-1.43-.5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"></path></svg>
      <span class="repo-commits-count">0</span>
    </a>
    <a class="stat-item link-issues" href="#" target="_blank" rel="noopener noreferrer">
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="icon"><path fill="currentColor" d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path><path fill="currentColor" d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path></svg>
      <span class="repo-issues-count">0</span>
    </a>
  </div>
</div>
"##;

static PATREON: &str = r##"
<a class="github-btn btn-patreon" href="{patreon_url}" target="_blank" rel="noopener noreferrer">
    <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="icon">
      <circle cx="9.5" cy="6.2" r="5.2" fill="#FF424D"></circle>
      <rect x="1.3" y="0.6" width="2.4" height="14.8" fill="#052D49"></rect>
    </svg>
    Patreon
</a>
"##;

impl Preprocessor for GithubRepositoryCard {
    fn name(&self) -> &str {
        "github-repository-card"
    }

    fn run(
        &self,
        ctx: &PreprocessorContext,
        mut book: Book,
    ) -> Result<Book, Error> {
        let conf_raw = ctx.config.get::<Table>(&format!(
            "preprocessor.{}",
            self.name()
        ))?;

        let mut username = "";
        let mut repository = "";
        let mut patreon_url = "";

        if let Some(conf) = &conf_raw {
            username = conf
                .get("username")
                .and_then(|v| v.as_str())
                .unwrap_or_default();
            repository = conf
                .get("repository")
                .and_then(|v| v.as_str())
                .unwrap_or_default();
            patreon_url = conf
                .get("patreon_url")
                .and_then(|v| v.as_str())
                .unwrap_or_default();
        }

        if username.is_empty() || repository.is_empty() {
            eprintln!(
                "[ERROR]: Configuration for username or repository is missing. Please specify both in the preprocessor configuration under `username` and `repository`."
            );
            return Ok(book);
        }

        let patreon = if !patreon_url.is_empty() {
            PATREON.replace("{patreon_url}", &patreon_url)
        } else {
            eprintln!("[INFO]: Patreon url was not specified.");
            String::from("")
        };

        let re = Regex::new(r"---").unwrap();

        let html = HTML
            .replace("{username}", username)
            .replace("{repository}", repository)
            .replace("{patreon}", &patreon);

        book.for_each_mut(|item| {
            if let mdbook_preprocessor::book::BookItem::Chapter(
                chapter,
            ) = item
            {
                chapter.content = re
                    .replace_all(
                        &chapter.content,
                        |_caps: &regex::Captures| {
                            format!("---\n\n{}\n\n", html)
                        },
                    )
                    .to_string();
            }
        });

        Ok(book)
    }
}

fn main() {
    let preprocessor = GithubRepositoryCard;

    if std::env::args().len() > 1 {
        if std::env::args().nth(1).unwrap() == "supports" {
            process::exit(0);
        }
    }

    if let Err(e) = handle_preprocessing(&preprocessor) {
        eprintln!("{}", e);
        process::exit(1);
    }
}

fn handle_preprocessing(
    pre: &impl Preprocessor,
) -> Result<(), mdbook_preprocessor::errors::Error> {
    let (ctx, book) =
        mdbook_preprocessor::parse_input(io::stdin())?;
    let processed_book = pre.run(&ctx, book)?;
    serde_json::to_writer(io::stdout(), &processed_book)?;
    Ok(())
}
