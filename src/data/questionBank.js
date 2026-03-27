// ============================================================
// Question Bank — Judge0 Coding Assessments
// Each skill has: title, difficulty, languageId, description,
// inputFormat, outputFormat, example, and 5 hidden test cases.
// Test cases are NEVER sent to the client — server-side only.
// ============================================================

export const QUESTION_BANK = {

  // ── Python ──────────────────────────────────────────────────
  Python: {
    languageId: 71,
    difficulty: 'Medium',
    title: 'Even Sum & Odd Count',
    description:
      'Given a list of N integers, compute the sum of all even numbers and the count of all odd numbers in the list.',
    inputFormat: 'Line 1: integer N\nLine 2: N space-separated integers',
    outputFormat: 'Line 1: sum of even numbers\nLine 2: count of odd numbers',
    example: { input: '5\n1 2 3 4 5', output: '6\n3' },
    testCases: [
      { stdin: '5\n1 2 3 4 5',        expectedOutput: '6\n3'   },
      { stdin: '4\n2 4 6 8',          expectedOutput: '20\n0'  },
      { stdin: '3\n1 3 5',            expectedOutput: '0\n3'   },
      { stdin: '6\n10 11 12 13 14 15',expectedOutput: '36\n3'  },
      { stdin: '1\n7',                expectedOutput: '0\n1'   },
    ],
  },

  // ── JavaScript ──────────────────────────────────────────────
  JavaScript: {
    languageId: 63,
    difficulty: 'Medium',
    title: 'Array Max & Min',
    description:
      'Given an array of N integers, find and print the maximum value on the first line and the minimum value on the second line.',
    inputFormat: 'Line 1: integer N\nLine 2: N space-separated integers',
    outputFormat: 'Line 1: maximum value\nLine 2: minimum value',
    example: { input: '5\n3 1 4 1 5', output: '5\n1' },
    testCases: [
      { stdin: '5\n3 1 4 1 5',         expectedOutput: '5\n1'    },
      { stdin: '3\n10 20 30',           expectedOutput: '30\n10'  },
      { stdin: '1\n42',                 expectedOutput: '42\n42'  },
      { stdin: '4\n-1 -5 0 3',          expectedOutput: '3\n-5'   },
      { stdin: '6\n100 200 150 50 300 250', expectedOutput: '300\n50' },
    ],
  },

  // ── Java ────────────────────────────────────────────────────
  Java: {
    languageId: 62,
    difficulty: 'Easy',
    title: 'Palindrome Number Check',
    description:
      'Given an integer, determine whether it is a palindrome. An integer is a palindrome when it reads the same forward and backward.',
    inputFormat: 'A single integer',
    outputFormat: '"true" if palindrome, "false" otherwise',
    example: { input: '121', output: 'true' },
    testCases: [
      { stdin: '121',   expectedOutput: 'true'  },
      { stdin: '123',   expectedOutput: 'false' },
      { stdin: '0',     expectedOutput: 'true'  },
      { stdin: '1221',  expectedOutput: 'true'  },
      { stdin: '-121',  expectedOutput: 'false' },
    ],
  },

  // ── C++ ─────────────────────────────────────────────────────
  'C++': {
    languageId: 54,
    difficulty: 'Medium',
    title: 'Fibonacci Sequence',
    description:
      'Print the first N numbers of the Fibonacci sequence (starting from 0), separated by spaces.',
    inputFormat: 'A single integer N (1 ≤ N ≤ 20)',
    outputFormat: 'N Fibonacci numbers separated by spaces on a single line',
    example: { input: '5', output: '0 1 1 2 3' },
    testCases: [
      { stdin: '5',  expectedOutput: '0 1 1 2 3'              },
      { stdin: '1',  expectedOutput: '0'                      },
      { stdin: '2',  expectedOutput: '0 1'                    },
      { stdin: '8',  expectedOutput: '0 1 1 2 3 5 8 13'       },
      { stdin: '10', expectedOutput: '0 1 1 2 3 5 8 13 21 34' },
    ],
  },

  // ── C ───────────────────────────────────────────────────────
  C: {
    languageId: 50,
    difficulty: 'Easy',
    title: 'Sum of N Numbers',
    description: 'Given N integers, compute and print their sum.',
    inputFormat: 'Line 1: integer N\nLine 2: N space-separated integers',
    outputFormat: 'A single integer — the sum',
    example: { input: '3\n1 2 3', output: '6' },
    testCases: [
      { stdin: '3\n1 2 3',        expectedOutput: '6'   },
      { stdin: '5\n10 20 30 40 50', expectedOutput: '150' },
      { stdin: '1\n42',           expectedOutput: '42'  },
      { stdin: '4\n-1 2 -3 4',    expectedOutput: '2'   },
      { stdin: '2\n100 200',      expectedOutput: '300' },
    ],
  },

  // ── Go ──────────────────────────────────────────────────────
  Go: {
    languageId: 60,
    difficulty: 'Medium',
    title: 'Vowel & Consonant Counter',
    description:
      'Given a lowercase English string, count the number of vowels (a, e, i, o, u) and consonants. Print vowel count on line 1, consonant count on line 2.',
    inputFormat: 'A single lowercase string (no spaces)',
    outputFormat: 'Line 1: vowel count\nLine 2: consonant count',
    example: { input: 'hello', output: '2\n3' },
    testCases: [
      { stdin: 'hello',       expectedOutput: '2\n3' },
      { stdin: 'aeiou',       expectedOutput: '5\n0' },
      { stdin: 'xyz',         expectedOutput: '0\n3' },
      { stdin: 'programming', expectedOutput: '3\n8' },
      { stdin: 'python',      expectedOutput: '1\n5' },
    ],
  },

  // ── Ruby ────────────────────────────────────────────────────
  Ruby: {
    languageId: 72,
    difficulty: 'Easy',
    title: 'String Reversal',
    description: 'Given a string, print its reverse.',
    inputFormat: 'A single string (no spaces)',
    outputFormat: 'The reversed string',
    example: { input: 'hello', output: 'olleh' },
    testCases: [
      { stdin: 'hello',   expectedOutput: 'olleh'   },
      { stdin: 'world',   expectedOutput: 'dlrow'   },
      { stdin: 'racecar', expectedOutput: 'racecar' },
      { stdin: '12345',   expectedOutput: '54321'   },
      { stdin: 'abcde',   expectedOutput: 'edcba'   },
    ],
  },

  // ── Rust ────────────────────────────────────────────────────
  Rust: {
    languageId: 73,
    difficulty: 'Hard',
    title: 'Prime Filter',
    description:
      'Given N integers, print all prime numbers among them in the original order, space-separated. If none are prime, print "none".',
    inputFormat: 'Line 1: integer N\nLine 2: N space-separated integers',
    outputFormat: 'Prime numbers space-separated, or "none"',
    example: { input: '5\n1 2 3 4 5', output: '2 3 5' },
    testCases: [
      { stdin: '5\n1 2 3 4 5',       expectedOutput: '2 3 5'        },
      { stdin: '3\n4 6 8',           expectedOutput: 'none'          },
      { stdin: '4\n7 11 13 17',      expectedOutput: '7 11 13 17'    },
      { stdin: '5\n1 10 15 20 25',   expectedOutput: 'none'          },
      { stdin: '6\n2 3 5 7 11 13',   expectedOutput: '2 3 5 7 11 13' },
    ],
  },

  // ── PHP ─────────────────────────────────────────────────────
  PHP: {
    languageId: 68,
    difficulty: 'Easy',
    title: 'Factorial Calculator',
    description: 'Given a non-negative integer N, compute and print N! (N factorial).',
    inputFormat: 'A single non-negative integer N (0 ≤ N ≤ 12)',
    outputFormat: 'A single integer — N!',
    example: { input: '5', output: '120' },
    testCases: [
      { stdin: '5',  expectedOutput: '120'     },
      { stdin: '0',  expectedOutput: '1'       },
      { stdin: '1',  expectedOutput: '1'       },
      { stdin: '10', expectedOutput: '3628800' },
      { stdin: '7',  expectedOutput: '5040'    },
    ],
  },

  // ── TypeScript ──────────────────────────────────────────────
  TypeScript: {
    languageId: 74,
    difficulty: 'Medium',
    title: 'Missing Number Finder',
    description:
      'Given N-1 distinct integers from 1 to N (with exactly one missing), find and print the missing number.',
    inputFormat: 'Line 1: integer N\nLine 2: N-1 space-separated integers',
    outputFormat: 'The missing number',
    example: { input: '5\n1 2 4 5', output: '3' },
    testCases: [
      { stdin: '5\n1 2 4 5', expectedOutput: '3' },
      { stdin: '3\n1 3',     expectedOutput: '2' },
      { stdin: '4\n2 3 4',   expectedOutput: '1' },
      { stdin: '6\n1 2 3 4 6', expectedOutput: '5' },
      { stdin: '5\n2 3 4 5', expectedOutput: '1' },
    ],
  },

  // ── C# ──────────────────────────────────────────────────────
  'C#': {
    languageId: 51,
    difficulty: 'Easy',
    title: 'Word Count',
    description:
      'Given a sentence, count and print the number of words (words are separated by single spaces).',
    inputFormat: 'A single line of text',
    outputFormat: 'A single integer — the number of words',
    example: { input: 'hello world', output: '2' },
    testCases: [
      { stdin: 'hello world',          expectedOutput: '2' },
      { stdin: 'the quick brown fox',  expectedOutput: '4' },
      { stdin: 'one',                  expectedOutput: '1' },
      { stdin: 'a b c d e',            expectedOutput: '5' },
      { stdin: 'I love programming',   expectedOutput: '3' },
    ],
  },

  // ── Swift ───────────────────────────────────────────────────
  Swift: {
    languageId: 83,
    difficulty: 'Medium',
    title: 'Second Largest Element',
    description:
      'Given an array of N integers, find and print the second largest distinct value. If all elements are the same, print that value.',
    inputFormat: 'Line 1: integer N\nLine 2: N space-separated integers',
    outputFormat: 'The second largest value',
    example: { input: '5\n1 2 3 4 5', output: '4' },
    testCases: [
      { stdin: '5\n1 2 3 4 5',    expectedOutput: '4'  },
      { stdin: '4\n10 20 20 30',  expectedOutput: '20' },
      { stdin: '3\n5 5 5',        expectedOutput: '5'  },
      { stdin: '2\n1 2',          expectedOutput: '1'  },
      { stdin: '6\n3 1 4 1 5 9',  expectedOutput: '5'  },
    ],
  },

  // ── Kotlin ──────────────────────────────────────────────────
  Kotlin: {
    languageId: 78,
    difficulty: 'Easy',
    title: 'String Palindrome Check',
    description:
      'Given a string, check if it is a palindrome (reads the same forward and backward). Print "true" or "false".',
    inputFormat: 'A single string (lowercase, no spaces)',
    outputFormat: '"true" or "false"',
    example: { input: 'racecar', output: 'true' },
    testCases: [
      { stdin: 'racecar', expectedOutput: 'true'  },
      { stdin: 'hello',   expectedOutput: 'false' },
      { stdin: 'madam',   expectedOutput: 'true'  },
      { stdin: 'abc',     expectedOutput: 'false' },
      { stdin: 'level',   expectedOutput: 'true'  },
    ],
  },
};

// All available skill names for validation
export const AVAILABLE_SKILLS = Object.keys(QUESTION_BANK);

// Difficulty color map (for frontend reference)
export const DIFFICULTY_INFO = {
  Easy:   { color: '#16A34A', bg: '#F0FDF4' },
  Medium: { color: '#D97706', bg: '#FFFBEB' },
  Hard:   { color: '#DC2626', bg: '#FEF2F2' },
};
