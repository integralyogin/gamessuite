# decode_entities.py
import html
import os

# --- CONFIGURATION ---

# The text file you want to clean (the output from the previous script).
INPUT_TEXT_FILE = 'texts/sa35.LOHATA.txt' 

# The name of the final, clean file that will be created.
OUTPUT_TEXT_FILE = 'texts/lohata_cleaned.txt'

# --- SCRIPT ---

def decode_sanskrit_entities(input_path, output_path):
    """
    Reads a text file and converts all HTML numeric character entities
    (e.g., &#2309;) into their corresponding Unicode characters.
    """
    print(f"--- HTML Entity Decoder ---")
    
    # 1. Read the input file
    try:
        print(f"Reading source file: {input_path}")
        with open(input_path, 'r', encoding='utf-8') as f:
            content_with_entities = f.read()
    except FileNotFoundError:
        print(f"\n[ERROR] Input file not found: '{input_path}'")
        print("Please make sure the file exists in the specified location.")
        return

    # 2. Decode the entities into actual characters
    print("Converting numeric entities into Sanskrit characters...")
    decoded_content = html.unescape(content_with_entities)
    print("Conversion successful.")

    # 3. Write the fully decoded content to the new output file
    try:
        # Ensure the output directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir and not os.path.exists(output_dir):
            print(f"Creating output directory: {output_dir}")
            os.makedirs(output_dir)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(decoded_content)
            
        print(f"\n--- Success! ---")
        print(f"Fully decoded text has been saved to '{output_path}'.")
        
    except IOError as e:
        print(f"\n[ERROR] Could not write to output file: {e}")
        return

# --- Main Execution ---
if __name__ == '__main__':
    decode_sanskrit_entities(INPUT_TEXT_FILE, OUTPUT_TEXT_FILE)


