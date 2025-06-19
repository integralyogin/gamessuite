# fix_chapters.py
import json
import re
import os

# --- Configuration ---

JSON_FILE_PATH = 'js/aurobindo_definitions.json'
TEXTS_DIRECTORY = 'texts/'

# This map helps the script find the right text file for each book abbreviation.
BOOK_ABBR_TO_FILENAME = {

        'EDAH': 'sa12.EDAH.txt',
        'EIPAY': 'sa13.EIPAY.txt',
    'ISHA': 'sa17.ISHA.txt',
    'TLD': 'sa21.TLD.txt',
    'TSOY': 'sa23.TSOY.txt',
    'THC': 'sa25.THC.txt',
    'LOY1': 'sa28.LOY1.txt',
    'LOY2': 'sa29.LOY2.txt',
    'LOY3': 'sa30.LOY3.txt',
    'SAV': 'sa31.Savitri.txt',
    'TMWLOTM': 'sa32.TMWLOTM.txt',
    'LOHATA': 'sa35.LOHATA.txt',
    'WOTM2': 'tm_wotm2.txt',
    'WOTM3': 'tm_wotm3.txt'
}

# --- Helper Functions ---

def normalize_text(text):
    """
    Normalizes text for comparison by removing excessive whitespace and newlines.
    This helps match the definition from the JSON with the text in the file.
    """
    return re.sub(r'\s+', ' ', text).strip()

def parse_chapter_title(line):
    """
    Identifies if a line is a chapter/canto title and extracts it.
    This is a Python version of the logic used in the JavaScript files.
    """
    trimmed_line = line.strip()
    if not trimmed_line or len(trimmed_line) > 150:
        return None

    # Check for keywords or all-caps format
    keywords = ['CANTO', 'BOOK', 'CHAPTER', 'PART', 'SECTION']
    is_title = (trimmed_line.upper() == trimmed_line and re.search(r'[A-Z]', trimmed_line)) or \
               any(trimmed_line.upper().startswith(kw) for kw in keywords)

    if not is_title:
        return None

    # If it's a title, try to clean it by removing prefixes
    title = trimmed_line
    if ' - ' in title:
        return title.split(' - ', 1)[1].strip()
    if ': ' in title:
        return title.split(': ', 1)[1].strip()

    return title # Return the whole line if no separator is found (e.g., "CANTO I")


def find_chapter_for_quote(file_path, quote):
    """
    Searches a given text file for a quote and returns the chapter it belongs to.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f"  [Error] Text file not found: {file_path}")
        return None

    # Prepare a simplified, searchable version of the quote.
    # Using the first 80 characters is usually enough to find a unique match.
    search_snippet = normalize_text(quote)[:80]
    
    # Combine the whole book into one normalized string for easier searching.
    full_text_normalized = normalize_text("".join(lines))
    
    match_index = full_text_normalized.find(search_snippet)
    
    if match_index == -1:
        return None # Quote not found in the entire book

    # If found, now we need to determine the chapter by line position.
    # Count characters until we reach the match index to find the line number.
    char_count = 0
    line_of_match = 0
    for i, line in enumerate(lines):
        char_count += len(normalize_text(line)) + 1 # +1 for the space separator
        if char_count >= match_index:
            line_of_match = i
            break
            
    # Now, search backwards from that line to find the last chapter title.
    current_chapter = "Unknown"
    for i in range(line_of_match, -1, -1):
        parsed_title = parse_chapter_title(lines[i])
        if parsed_title:
            current_chapter = parsed_title
            break # Found the most recent chapter title

    return current_chapter

# --- Main Script ---

def main():
    print(f"Starting chapter update for {JSON_FILE_PATH}...")
    
    try:
        with open(JSON_FILE_PATH, 'r', encoding='utf-8') as f:
            definitions = json.load(f)
    except FileNotFoundError:
        print(f"[FATAL] JSON file not found at {JSON_FILE_PATH}. Exiting.")
        return
    except json.JSONDecodeError:
        print(f"[FATAL] Could not parse the JSON file. Check for syntax errors.")
        return

    updated_count = 0
    not_found_count = 0
    
    # Iterate over a copy of the list to allow for modification
    for entry in definitions:
        source = entry.get('source', '')
        term = entry.get('term', 'Unknown Term')

        # Check if the entry needs fixing
        if ', ??]' in source:
            print(f"\nProcessing term: '{term}'")
            
            # Extract the book abbreviation (e.g., "TLD")
            match = re.match(r'\[(\w+),\s*\?\?\]', source)
            if not match:
                print(f"  [Warning] Could not parse book abbreviation from source: {source}")
                continue
            
            book_abbr = match.group(1)
            filename = BOOK_ABBR_TO_FILENAME.get(book_abbr)
            
            if not filename:
                print(f"  [Warning] No text file mapping for abbreviation: {book_abbr}")
                continue

            file_path = os.path.join(TEXTS_DIRECTORY, filename)
            quote_to_find = entry.get('definition', '')

            if not quote_to_find:
                print(f"  [Warning] Entry for '{term}' has no definition to search for.")
                continue

            # Find the chapter
            found_chapter = find_chapter_for_quote(file_path, quote_to_find)

            if found_chapter:
                print(f"  [Success] Found in chapter: '{found_chapter}'")
                entry['source'] = f"[{book_abbr}, {found_chapter}]"
                updated_count += 1
            else:
                print(f"  [Failed] Could not locate the quote in {file_path}.")
                not_found_count += 1
    
    # Write the updated data back to the JSON file
    with open(JSON_FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(definitions, f, indent=2)

    print("\n--------------------")
    print("Operation Complete.")
    print(f"Updated Entries: {updated_count}")
    print(f"Entries Not Found: {not_found_count}")
    print(f"File '{JSON_FILE_PATH}' has been updated.")

if __name__ == '__main__':
    main()
