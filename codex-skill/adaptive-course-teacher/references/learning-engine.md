# Learning Engine

The parts of a learning project that decide what to teach next and whether it sticks. Create each file lazily, the first time it has real content.

## Mission

`MISSION.md` is the compass. Every choice of unit, source, exercise, and filter traces back to it.

- **Why:** the concrete outcome the learner wants, such as "draw figures in motion without structural mistakes", not "understand anatomy".
- **Success looks like:** observable things the learner will be able to do.
- **Constraints:** time, tools, devices, language, and attention costs.
- **Out of scope:** adjacent topics to leave alone for now.
- **Current boundary:** what the learner already does without help, and the next useful challenge.

If the learner cannot say why they are learning something, ask before producing lessons; a vague mission produces abstract lessons. Keep the file to about one screen. When the goal shifts, confirm with the learner, update the file, and write a learning record about the shift.

## Resources

`RESOURCES.md` lists trusted sources, each with one line on what it covers and when to use it.

- Prefer the course or book being studied, official documentation, recognized experts, and well-moderated communities. Leave out marketing dressed as teaching.
- Do not rely on model memory for facts the learner will build on. Check the source, then cite it inside lessons and notes.
- List a `Gaps` section for areas the mission needs but no good source covers yet.
- Communities are optional. Offer one when a question needs real practitioners (critique, troubleshooting, taste); if the learner declines, record that and stop proposing them.

## Learning Records

`learning-records/0001-short-slug.md`, numbered upward. A record captures a decision-grade fact about the learner, not a diary entry.

Write one when:

1. the learner demonstrates real understanding or performance (explains it, predicts behavior, does it without prompts);
2. the learner states prior knowledge ("I already know X"), including how deep;
3. a misconception is corrected;
4. the mission or method changes because of what was learned.

Format: a title and one to three sentences saying what is now known and why it changes what to teach next. Add `Evidence` or `Implications` only when they matter. When later evidence contradicts a record, mark the old one `Status: superseded by NNNN` instead of deleting it.

Do not record material that was merely covered, produced, or read by the agent.

## Choosing the Next Unit

Read the mission, the newest records, and the checkpoint. Teach the most useful thing just beyond what the learner can already do: close enough that it builds on known material, hard enough to need effort. If the learner names what they want, teach that, connecting it to what the records say they know. Do not generate a long fixed sequence because a syllabus exists.

## Filtering Dense Material

Books and courses often list far more names, parameters, or variations than the learner's goal needs. Before asking the learner to remember anything:

- Sort the unit's items into what the mission needs now, what is worth recognizing, and what is lookup-only.
- Use evidence where possible: what the source itself marks as essential, what reappears in later chapters or lessons, and what the learner's real task uses.
- Say briefly why an item is in a tier. Keep the source text complete; filtering changes emphasis, not the text.
- Turn the must-have tier into a short check (identify it on an image, predict a result, sketch or perform it), not a list to reread.

## Practice Inside Reading

When the learner studies from a reading edition or a long page, put practice where the material was just read instead of on a separate page.

- Place a check right after the passage it tests; a mixed review goes at the end of the section. Label every added block as not part of the source, and leave the source text around it unchanged.
- Recognize first, then recall: a guided round shows where each item is, then a blind round asks in random order and shows the correction after a miss. Aim for a few clean blind runs in a row.
- Before drilling, give one image that holds the items together, using only facts the source supports.
- Show the mission filter as a short hint above the dense passage. Do not turn filtering into a sorting task, and do not ask the learner to memorize mnemonics.
- Mix earlier items into later reviews, repeat first-attempt misses once, and let a quick real-world attempt (a sketch, an operation, a sentence) close the review with a self-check.
- Hide answers semantically: crops without neighbouring labels, alt text that does not name the answer, options of similar length.
- Keep checks data-driven when a project will need many of them, so a new section needs only new data.

## Fluency and Durable Memory

Feeling fluent right after a lesson is not the same as remembering it later.

- **Retrieval:** ask the learner to recall, explain, or perform before showing the answer.
- **Spacing:** bring the item back after a gap; lengthen the gap after success, shorten it after errors or heavy effort. Starting intervals are guesses to adjust, not a memory law.
- **Interleaving:** once single skills work, mix related items in practice so the learner must choose which one applies.

Knowledge acquisition wants low friction; skill practice wants effort. Do not make explanations hard, and do not make practice easy.

## Checks and Quizzes

- Hide every answer-bearing element during recall: side lists, captions, examples, and accessible names, not only the main answer.
- Give options of similar length and form so formatting never reveals the answer.
- Feedback states what is wrong and what to change, immediately and specifically.
- Record which capability was tested: recognition, explanation, guided performance, independent recall, independent production, or quality. A strong result in one does not prove another.

## Reference Sheets and Glossary

Lessons are rarely revisited; reference sheets are. After a unit, when the learner wants something to keep, compress it into a quick-reference sheet in `reference/` that scans quickly and prints cleanly: a rule, a decision table, a procedure with checkpoints, a shortcut registry, or a landmark map.

- Integrate adopted advice from the source directly into the rule where it belongs. Do not keep a separate "the source says / we do" comparison unless the contrast prevents a likely mistake.
- Keep one canonical home per note. When notes live in an external note app, do not keep a stale local duplicate.

`GLOSSARY.md` holds terms the learner can already use correctly, one or two sentences each, with the preferred term and aliases to avoid. Add a term after the learner uses it correctly, not when it is first introduced. Once a term is in the glossary, use it consistently in lessons and notes. When the field uses a word loosely, state how this project uses it. Revise a definition in place when understanding deepens instead of keeping stale entries; group terms under subheadings once clusters appear.

## Lessons

A lesson is one self-contained artifact that gives the learner one clear win tied to the mission. Save lessons as `lessons/0001-short-name.html`, numbered upward. Keep it short enough to finish in one sitting. Link it to related lessons and reference sheets, recommend the primary source to go back to, and end with an invitation to ask follow-up questions. Build lessons from the project's shared `assets/` (stylesheet, components) instead of copying code between lessons.
