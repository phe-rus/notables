//! Text preparation for Supertonic, following the official helper: Unicode
//! NFKD, typographic marks folded to ASCII, emoji and symbols dropped,
//! closing punctuation ensured, and the language tag wrapped around it.

use unicode_normalization::UnicodeNormalization;

/// Longer text is split and the pieces joined with a short silence.
pub const MAX_CHARS: usize = 300;

fn is_emoji(c: char) -> bool {
    matches!(u32::from(c),
        0x1F600..=0x1F64F | 0x1F300..=0x1F5FF | 0x1F680..=0x1F6FF | 0x1F700..=0x1F77F
        | 0x1F780..=0x1F7FF | 0x1F800..=0x1F8FF | 0x1F900..=0x1F9FF | 0x1FA00..=0x1FA6F
        | 0x1FA70..=0x1FAFF | 0x2600..=0x26FF | 0x2700..=0x27BF | 0x1F1E6..=0x1F1FF)
}

const CLOSING: &str = ".!?;:,'\"\u{201C}\u{201D}\u{2018}\u{2019})]}\u{2026}\u{3002}\u{300D}\u{300F}\u{3011}\u{3009}\u{300B}\u{203A}\u{00BB}";

/// Normalises one piece of text the way the model was trained on.
pub fn normalize(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for c in text.nfkd() {
        if is_emoji(c) {
            continue;
        }
        match c {
            '\u{2013}' | '\u{2011}' | '\u{2014}' => out.push('-'),
            '_' | '[' | ']' | '|' | '/' | '#' | '\u{2192}' | '\u{2190}' => out.push(' '),
            '\u{201C}' | '\u{201D}' => out.push('"'),
            '\u{2018}' | '\u{2019}' | '\u{00B4}' | '`' => out.push('\''),
            '\u{2665}' | '\u{2606}' | '\u{2661}' | '\u{00A9}' | '\\' => {}
            '@' => out.push_str(" at "),
            c => out.push(c),
        }
    }
    let out = out
        .replace("e.g.,", "for example, ")
        .replace("i.e.,", "that is, ");
    // Collapse whitespace, and drop spaces before closing marks.
    let mut tidy = String::with_capacity(out.len());
    for word in out.split_whitespace() {
        let glued = word.starts_with([',', '.', '!', '?', ';', ':', '\'']);
        if !tidy.is_empty() && !glued {
            tidy.push(' ');
        }
        tidy.push_str(word);
    }
    if !tidy.is_empty() && !tidy.ends_with(|c| CLOSING.contains(c)) {
        tidy.push('.');
    }
    tidy
}

/// Replaces characters the model has no entry for with spaces, then tidies.
pub fn keep_known(text: &str, known: impl Fn(char) -> bool) -> String {
    let replaced: String = text
        .chars()
        .map(|c| if known(c) { c } else { ' ' })
        .collect();
    replaced.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Wraps text in its language tag: `<fr>Bonjour.</fr>`.
pub fn tagged(text: &str, lang: &str) -> String {
    format!("<{lang}>{text}</{lang}>")
}

/// Splits text into pieces of at most `MAX_CHARS` characters: at sentence
/// and clause punctuation first, then at whitespace, then anywhere.
pub fn chunks(text: &str) -> Vec<String> {
    let text = text.trim();
    if text.chars().count() <= MAX_CHARS {
        return if text.is_empty() {
            Vec::new()
        } else {
            vec![text.to_owned()]
        };
    }
    let mut pieces = Vec::new();
    split_into(text, &[".!?;\u{3002}", ",:\u{060C}", " "], &mut pieces);
    pieces
}

/// Splits after any of the first group's marks, packing parts up to the
/// limit; parts still too long fall to the next group.
fn split_into(text: &str, groups: &[&str], out: &mut Vec<String>) {
    let Some((marks, rest)) = groups.split_first() else {
        // No boundary left: cut by characters.
        let chars: Vec<char> = text.chars().collect();
        out.extend(
            chars
                .chunks(MAX_CHARS)
                .map(|c| c.iter().collect::<String>()),
        );
        return;
    };
    let mut parts = Vec::new();
    let mut start = 0;
    for (index, c) in text.char_indices() {
        if marks.contains(c) {
            let end = index + c.len_utf8();
            parts.push(&text[start..end]);
            start = end;
        }
    }
    parts.push(&text[start..]);

    let mut current = String::new();
    for part in parts {
        let part_len = part.chars().count();
        if part_len > MAX_CHARS {
            push_trimmed(&mut current, out);
            split_into(part.trim(), rest, out);
            continue;
        }
        if current.chars().count() + part_len > MAX_CHARS {
            push_trimmed(&mut current, out);
        }
        current.push_str(part);
    }
    push_trimmed(&mut current, out);
}

fn push_trimmed(current: &mut String, out: &mut Vec<String>) {
    let piece = current.trim();
    if !piece.is_empty() {
        out.push(piece.to_owned());
    }
    current.clear();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_like_the_official_helper() {
        // A closing quote already ends the sentence.
        assert_eq!(
            normalize("Hello \u{201C}world\u{201D} \u{1F600}"),
            "Hello \"world\""
        );
        assert_eq!(normalize("Wait , what ?"), "Wait, what?");
        assert_eq!(normalize("a\u{2014}b  @home"), "a-b at home.");
        assert_eq!(normalize("Done!"), "Done!");
        assert_eq!(normalize("   "), "");
    }

    #[test]
    fn replaces_unknown_characters() {
        assert_eq!(keep_known("a\u{2603}b c", |c| c != '\u{2603}'), "a b c");
    }

    #[test]
    fn keeps_short_text_whole() {
        assert_eq!(chunks("One. Two."), vec!["One. Two."]);
        assert!(chunks("  ").is_empty());
    }

    #[test]
    fn splits_long_text_at_sentences_then_words() {
        let sentence = "This sentence is about forty characters. ";
        let long = sentence.repeat(20);
        let pieces = chunks(&long);
        assert!(pieces.len() > 1);
        assert!(
            pieces
                .iter()
                .all(|piece| piece.chars().count() <= MAX_CHARS)
        );
        assert!(pieces.iter().all(|piece| piece.ends_with('.')));

        let words = "word ".repeat(200);
        let pieces = chunks(&words);
        assert!(
            pieces
                .iter()
                .all(|piece| piece.chars().count() <= MAX_CHARS)
        );
        assert_eq!(pieces.join(" ").split_whitespace().count(), 200);
    }
}
