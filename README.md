# Study Site

Static multi-course study site designed to be copied directly into an existing GitHub/Cloudflare repository.

## Routes

- `/` — course homepage
- `/bio191/` — Biology 191 study app

## Data layout

- `data/courses.json` controls the course cards shown on the homepage.
- `bio191/data/manifest.json` defines exams, chapters, and card categories for Biology 191.
- `bio191/data/flashcards.json` stores the Biology 191 flashcard deck.
- `bio191/data/test-questions.json` stores Test Mode questions and their six question-specific distractors.

For every test question, the distractor pool contains:
- 2 close distractors
- 2 medium distractors
- 2 clear distractors

Each test attempt displays the correct answer plus one distractor from each tier, then shuffles the four displayed choices.

## Adding another course later

1. Copy the `bio191/` folder and rename it for the new course.
2. Replace that folder's manifest/card/test JSON files.
3. Add one entry to `data/courses.json`.
4. Link paths relatively so the same repository works behind any domain.

No build step or external JavaScript libraries are required.
