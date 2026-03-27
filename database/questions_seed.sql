-- ============================================================
-- Seed: Level-wise questions for all 13 supported languages
-- Bronze = Easy, Silver = Medium, Gold = Hard
-- ============================================================

INSERT INTO questions (skill, level, language_id, title, description, input_format, output_format, example, test_cases) VALUES

-- ══════════════════════════════════════════════
-- PYTHON
-- ══════════════════════════════════════════════
('Python', 'Bronze', 71,
  'FizzBuzz',
  'Print numbers from 1 to N. For multiples of 3 print "Fizz", multiples of 5 print "Buzz", multiples of both print "FizzBuzz".',
  'A single integer N',
  'N lines of FizzBuzz output',
  '{"input": "5", "output": "1\n2\nFizz\n4\nBuzz"}',
  '[{"stdin":"5","expectedOutput":"1\n2\nFizz\n4\nBuzz"},{"stdin":"3","expectedOutput":"1\n2\nFizz"},{"stdin":"15","expectedOutput":"1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz"},{"stdin":"1","expectedOutput":"1"},{"stdin":"10","expectedOutput":"1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz"}]'
),

('Python', 'Silver', 71,
  'Even Sum & Odd Count',
  'Given a list of N integers, compute the sum of all even numbers and the count of all odd numbers.',
  'Line 1: integer N\nLine 2: N space-separated integers',
  'Line 1: sum of even numbers\nLine 2: count of odd numbers',
  '{"input": "5\n1 2 3 4 5", "output": "6\n3"}',
  '[{"stdin":"5\n1 2 3 4 5","expectedOutput":"6\n3"},{"stdin":"4\n2 4 6 8","expectedOutput":"20\n0"},{"stdin":"3\n1 3 5","expectedOutput":"0\n3"},{"stdin":"6\n10 11 12 13 14 15","expectedOutput":"36\n3"},{"stdin":"1\n7","expectedOutput":"0\n1"}]'
),

('Python', 'Gold', 71,
  'Longest Increasing Subsequence Length',
  'Given an array of N integers, find the length of the longest strictly increasing subsequence.',
  'Line 1: integer N\nLine 2: N space-separated integers',
  'A single integer — the LIS length',
  '{"input": "6\n10 9 2 5 3 7", "output": "3"}',
  '[{"stdin":"6\n10 9 2 5 3 7","expectedOutput":"3"},{"stdin":"8\n0 1 0 3 2 3 0 8","expectedOutput":"5"},{"stdin":"1\n5","expectedOutput":"1"},{"stdin":"5\n5 4 3 2 1","expectedOutput":"1"},{"stdin":"6\n1 2 3 4 5 6","expectedOutput":"6"}]'
),

-- ══════════════════════════════════════════════
-- JAVASCRIPT
-- ══════════════════════════════════════════════
('JavaScript', 'Bronze', 63,
  'Sum of Array',
  'Given N integers, compute and print their sum.',
  'Line 1: integer N\nLine 2: N space-separated integers',
  'A single integer — the sum',
  '{"input": "3\n1 2 3", "output": "6"}',
  '[{"stdin":"3\n1 2 3","expectedOutput":"6"},{"stdin":"5\n10 20 30 40 50","expectedOutput":"150"},{"stdin":"1\n42","expectedOutput":"42"},{"stdin":"4\n-1 2 -3 4","expectedOutput":"2"},{"stdin":"2\n100 200","expectedOutput":"300"}]'
),

('JavaScript', 'Silver', 63,
  'Array Max & Min',
  'Given an array of N integers, find and print the maximum value on the first line and the minimum value on the second line.',
  'Line 1: integer N\nLine 2: N space-separated integers',
  'Line 1: maximum value\nLine 2: minimum value',
  '{"input": "5\n3 1 4 1 5", "output": "5\n1"}',
  '[{"stdin":"5\n3 1 4 1 5","expectedOutput":"5\n1"},{"stdin":"3\n10 20 30","expectedOutput":"30\n10"},{"stdin":"1\n42","expectedOutput":"42\n42"},{"stdin":"4\n-1 -5 0 3","expectedOutput":"3\n-5"},{"stdin":"6\n100 200 150 50 300 250","expectedOutput":"300\n50"}]'
),

('JavaScript', 'Gold', 63,
  'Two Sum Indices',
  'Given N integers and a target T, find indices (0-based) of two numbers that add up to T. Print the two indices separated by a space. Guaranteed exactly one solution.',
  'Line 1: integer N\nLine 2: N space-separated integers\nLine 3: target T',
  'Two 0-based indices separated by a space',
  '{"input": "4\n2 7 11 15\n9", "output": "0 1"}',
  '[{"stdin":"4\n2 7 11 15\n9","expectedOutput":"0 1"},{"stdin":"3\n3 2 4\n6","expectedOutput":"1 2"},{"stdin":"2\n3 3\n6","expectedOutput":"0 1"},{"stdin":"5\n1 5 3 7 2\n9","expectedOutput":"1 3"},{"stdin":"4\n0 4 3 0\n0","expectedOutput":"0 3"}]'
),

-- ══════════════════════════════════════════════
-- JAVA
-- ══════════════════════════════════════════════
('Java', 'Bronze', 62,
  'Even or Odd',
  'Given N integers, print "even" or "odd" for each on a separate line.',
  'Line 1: integer N\nLine 2: N space-separated integers',
  'N lines of "even" or "odd"',
  '{"input": "3\n1 2 3", "output": "odd\neven\nodd"}',
  '[{"stdin":"3\n1 2 3","expectedOutput":"odd\neven\nodd"},{"stdin":"4\n2 4 6 8","expectedOutput":"even\neven\neven\neven"},{"stdin":"1\n7","expectedOutput":"odd"},{"stdin":"5\n0 1 2 3 4","expectedOutput":"even\nodd\neven\nodd\neven"},{"stdin":"2\n100 99","expectedOutput":"even\nodd"}]'
),

('Java', 'Silver', 62,
  'Palindrome Number Check',
  'Given an integer, determine whether it is a palindrome. An integer is a palindrome when it reads the same forward and backward.',
  'A single integer',
  '"true" if palindrome, "false" otherwise',
  '{"input": "121", "output": "true"}',
  '[{"stdin":"121","expectedOutput":"true"},{"stdin":"123","expectedOutput":"false"},{"stdin":"0","expectedOutput":"true"},{"stdin":"1221","expectedOutput":"true"},{"stdin":"-121","expectedOutput":"false"}]'
),

('Java', 'Gold', 62,
  'Binary Search',
  'Given a sorted array of N integers and a target T, return the 0-based index of T. If not found, print -1.',
  'Line 1: integer N\nLine 2: N space-separated sorted integers\nLine 3: target T',
  'A single integer — the index or -1',
  '{"input": "5\n1 3 5 7 9\n5", "output": "2"}',
  '[{"stdin":"5\n1 3 5 7 9\n5","expectedOutput":"2"},{"stdin":"5\n1 3 5 7 9\n6","expectedOutput":"-1"},{"stdin":"1\n42\n42","expectedOutput":"0"},{"stdin":"6\n2 4 6 8 10 12\n10","expectedOutput":"4"},{"stdin":"4\n1 2 3 4\n1","expectedOutput":"0"}]'
),

-- ══════════════════════════════════════════════
-- C++
-- ══════════════════════════════════════════════
('C++', 'Bronze', 54,
  'Count Digits',
  'Given an integer N (≥ 0), print the number of digits it has.',
  'A single non-negative integer N',
  'A single integer — the digit count',
  '{"input": "12345", "output": "5"}',
  '[{"stdin":"12345","expectedOutput":"5"},{"stdin":"0","expectedOutput":"1"},{"stdin":"9","expectedOutput":"1"},{"stdin":"100","expectedOutput":"3"},{"stdin":"999999","expectedOutput":"6"}]'
),

('C++', 'Silver', 54,
  'Fibonacci Sequence',
  'Print the first N numbers of the Fibonacci sequence (starting from 0), separated by spaces.',
  'A single integer N (1 ≤ N ≤ 20)',
  'N Fibonacci numbers separated by spaces on a single line',
  '{"input": "5", "output": "0 1 1 2 3"}',
  '[{"stdin":"5","expectedOutput":"0 1 1 2 3"},{"stdin":"1","expectedOutput":"0"},{"stdin":"2","expectedOutput":"0 1"},{"stdin":"8","expectedOutput":"0 1 1 2 3 5 8 13"},{"stdin":"10","expectedOutput":"0 1 1 2 3 5 8 13 21 34"}]'
),

('C++', 'Gold', 54,
  'Matrix Diagonal Sum',
  'Given an N×N matrix, compute the sum of both diagonals (main and anti). If N is odd, the center element is counted only once.',
  'Line 1: integer N\nNext N lines: N space-separated integers per row',
  'A single integer — the diagonal sum',
  '{"input": "3\n1 2 3\n4 5 6\n7 8 9", "output": "25"}',
  '[{"stdin":"3\n1 2 3\n4 5 6\n7 8 9","expectedOutput":"25"},{"stdin":"2\n1 2\n3 4","expectedOutput":"10"},{"stdin":"1\n7","expectedOutput":"7"},{"stdin":"4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n13 14 15 16","expectedOutput":"68"},{"stdin":"3\n1 0 0\n0 1 0\n0 0 1","expectedOutput":"3"}]'
),

-- ══════════════════════════════════════════════
-- C
-- ══════════════════════════════════════════════
('C', 'Bronze', 50,
  'Largest of N Numbers',
  'Given N integers, find and print the largest.',
  'Line 1: integer N\nLine 2: N space-separated integers',
  'A single integer — the largest',
  '{"input": "3\n1 5 3", "output": "5"}',
  '[{"stdin":"3\n1 5 3","expectedOutput":"5"},{"stdin":"5\n10 20 30 40 50","expectedOutput":"50"},{"stdin":"1\n42","expectedOutput":"42"},{"stdin":"4\n-10 -5 -20 -1","expectedOutput":"-1"},{"stdin":"3\n100 200 150","expectedOutput":"200"}]'
),

('C', 'Silver', 50,
  'Sum of N Numbers',
  'Given N integers, compute and print their sum.',
  'Line 1: integer N\nLine 2: N space-separated integers',
  'A single integer — the sum',
  '{"input": "3\n1 2 3", "output": "6"}',
  '[{"stdin":"3\n1 2 3","expectedOutput":"6"},{"stdin":"5\n10 20 30 40 50","expectedOutput":"150"},{"stdin":"1\n42","expectedOutput":"42"},{"stdin":"4\n-1 2 -3 4","expectedOutput":"2"},{"stdin":"2\n100 200","expectedOutput":"300"}]'
),

('C', 'Gold', 50,
  'Check Sorted Array',
  'Given N integers, print "ascending" if the array is strictly ascending, "descending" if strictly descending, or "neither".',
  'Line 1: integer N\nLine 2: N space-separated integers',
  '"ascending", "descending", or "neither"',
  '{"input": "4\n1 2 3 4", "output": "ascending"}',
  '[{"stdin":"4\n1 2 3 4","expectedOutput":"ascending"},{"stdin":"4\n4 3 2 1","expectedOutput":"descending"},{"stdin":"4\n1 3 2 4","expectedOutput":"neither"},{"stdin":"1\n5","expectedOutput":"ascending"},{"stdin":"3\n5 5 5","expectedOutput":"neither"}]'
),

-- ══════════════════════════════════════════════
-- Go
-- ══════════════════════════════════════════════
('Go', 'Bronze', 60,
  'Character Count',
  'Given a string, print the number of characters it contains.',
  'A single string (no spaces)',
  'A single integer — the character count',
  '{"input": "hello", "output": "5"}',
  '[{"stdin":"hello","expectedOutput":"5"},{"stdin":"a","expectedOutput":"1"},{"stdin":"programming","expectedOutput":"11"},{"stdin":"go","expectedOutput":"2"},{"stdin":"abcdefghij","expectedOutput":"10"}]'
),

('Go', 'Silver', 60,
  'Vowel & Consonant Counter',
  'Given a lowercase English string, count vowels (a,e,i,o,u) and consonants. Print vowel count on line 1, consonant count on line 2.',
  'A single lowercase string (no spaces)',
  'Line 1: vowel count\nLine 2: consonant count',
  '{"input": "hello", "output": "2\n3"}',
  '[{"stdin":"hello","expectedOutput":"2\n3"},{"stdin":"aeiou","expectedOutput":"5\n0"},{"stdin":"xyz","expectedOutput":"0\n3"},{"stdin":"programming","expectedOutput":"3\n8"},{"stdin":"python","expectedOutput":"1\n5"}]'
),

('Go', 'Gold', 60,
  'Two Sum — Exists Check',
  'Given N integers and target T, print "yes" if any two distinct elements sum to T, else "no".',
  'Line 1: integer N\nLine 2: N space-separated integers\nLine 3: target T',
  '"yes" or "no"',
  '{"input": "4\n2 7 11 15\n9", "output": "yes"}',
  '[{"stdin":"4\n2 7 11 15\n9","expectedOutput":"yes"},{"stdin":"3\n1 2 3\n7","expectedOutput":"no"},{"stdin":"2\n3 3\n6","expectedOutput":"yes"},{"stdin":"5\n1 5 3 7 2\n10","expectedOutput":"yes"},{"stdin":"3\n1 2 3\n10","expectedOutput":"no"}]'
),

-- ══════════════════════════════════════════════
-- Ruby
-- ══════════════════════════════════════════════
('Ruby', 'Bronze', 72,
  'Count Words',
  'Given a sentence, print the number of words (words separated by single spaces).',
  'A single line of text',
  'A single integer — the word count',
  '{"input": "hello world", "output": "2"}',
  '[{"stdin":"hello world","expectedOutput":"2"},{"stdin":"the quick brown fox","expectedOutput":"4"},{"stdin":"one","expectedOutput":"1"},{"stdin":"a b c d e","expectedOutput":"5"},{"stdin":"I love coding","expectedOutput":"3"}]'
),

('Ruby', 'Silver', 72,
  'String Reversal',
  'Given a string, print its reverse.',
  'A single string (no spaces)',
  'The reversed string',
  '{"input": "hello", "output": "olleh"}',
  '[{"stdin":"hello","expectedOutput":"olleh"},{"stdin":"world","expectedOutput":"dlrow"},{"stdin":"racecar","expectedOutput":"racecar"},{"stdin":"12345","expectedOutput":"54321"},{"stdin":"abcde","expectedOutput":"edcba"}]'
),

('Ruby', 'Gold', 72,
  'Rotate Array',
  'Given N integers and rotation count K, rotate the array to the right by K positions and print the result space-separated.',
  'Line 1: integer N\nLine 2: N space-separated integers\nLine 3: integer K',
  'The rotated array space-separated',
  '{"input": "5\n1 2 3 4 5\n2", "output": "4 5 1 2 3"}',
  '[{"stdin":"5\n1 2 3 4 5\n2","expectedOutput":"4 5 1 2 3"},{"stdin":"3\n1 2 3\n1","expectedOutput":"3 1 2"},{"stdin":"4\n1 2 3 4\n4","expectedOutput":"1 2 3 4"},{"stdin":"5\n1 2 3 4 5\n0","expectedOutput":"1 2 3 4 5"},{"stdin":"3\n10 20 30\n2","expectedOutput":"20 30 10"}]'
),

-- ══════════════════════════════════════════════
-- Rust
-- ══════════════════════════════════════════════
('Rust', 'Bronze', 73,
  'Absolute Difference',
  'Given two integers A and B, print their absolute difference.',
  'Two integers A and B on a single line separated by a space',
  'A single integer — |A - B|',
  '{"input": "5 3", "output": "2"}',
  '[{"stdin":"5 3","expectedOutput":"2"},{"stdin":"3 5","expectedOutput":"2"},{"stdin":"0 0","expectedOutput":"0"},{"stdin":"-5 3","expectedOutput":"8"},{"stdin":"100 1","expectedOutput":"99"}]'
),

('Rust', 'Silver', 73,
  'Count Duplicates',
  'Given N integers, count how many appear more than once (count distinct duplicates).',
  'Line 1: integer N\nLine 2: N space-separated integers',
  'A single integer — count of distinct duplicate values',
  '{"input": "5\n1 2 2 3 3", "output": "2"}',
  '[{"stdin":"5\n1 2 2 3 3","expectedOutput":"2"},{"stdin":"4\n1 2 3 4","expectedOutput":"0"},{"stdin":"5\n1 1 1 1 1","expectedOutput":"1"},{"stdin":"6\n1 2 3 1 2 3","expectedOutput":"3"},{"stdin":"3\n7 7 8","expectedOutput":"1"}]'
),

('Rust', 'Gold', 73,
  'Prime Filter',
  'Given N integers, print all prime numbers among them in the original order, space-separated. If none are prime, print "none".',
  'Line 1: integer N\nLine 2: N space-separated integers',
  'Prime numbers space-separated, or "none"',
  '{"input": "5\n1 2 3 4 5", "output": "2 3 5"}',
  '[{"stdin":"5\n1 2 3 4 5","expectedOutput":"2 3 5"},{"stdin":"3\n4 6 8","expectedOutput":"none"},{"stdin":"4\n7 11 13 17","expectedOutput":"7 11 13 17"},{"stdin":"5\n1 10 15 20 25","expectedOutput":"none"},{"stdin":"6\n2 3 5 7 11 13","expectedOutput":"2 3 5 7 11 13"}]'
),

-- ══════════════════════════════════════════════
-- PHP
-- ══════════════════════════════════════════════
('PHP', 'Bronze', 68,
  'Even or Odd',
  'Given a single integer, print "even" if it is even, "odd" if it is odd.',
  'A single integer',
  '"even" or "odd"',
  '{"input": "4", "output": "even"}',
  '[{"stdin":"4","expectedOutput":"even"},{"stdin":"7","expectedOutput":"odd"},{"stdin":"0","expectedOutput":"even"},{"stdin":"-3","expectedOutput":"odd"},{"stdin":"100","expectedOutput":"even"}]'
),

('PHP', 'Silver', 68,
  'Factorial Calculator',
  'Given a non-negative integer N, compute and print N!',
  'A single non-negative integer N (0 ≤ N ≤ 12)',
  'A single integer — N!',
  '{"input": "5", "output": "120"}',
  '[{"stdin":"5","expectedOutput":"120"},{"stdin":"0","expectedOutput":"1"},{"stdin":"1","expectedOutput":"1"},{"stdin":"10","expectedOutput":"3628800"},{"stdin":"7","expectedOutput":"5040"}]'
),

('PHP', 'Gold', 68,
  'Pascal Triangle Row',
  'Given row index R (0-based), print the R-th row of Pascal''s triangle space-separated.',
  'A single integer R (0 ≤ R ≤ 10)',
  'The R-th Pascal triangle row space-separated',
  '{"input": "3", "output": "1 3 3 1"}',
  '[{"stdin":"3","expectedOutput":"1 3 3 1"},{"stdin":"0","expectedOutput":"1"},{"stdin":"1","expectedOutput":"1 1"},{"stdin":"4","expectedOutput":"1 4 6 4 1"},{"stdin":"5","expectedOutput":"1 5 10 10 5 1"}]'
),

-- ══════════════════════════════════════════════
-- TypeScript
-- ══════════════════════════════════════════════
('TypeScript', 'Bronze', 74,
  'First Duplicate',
  'Given N integers, print the first integer that appears more than once. If none, print -1.',
  'Line 1: integer N\nLine 2: N space-separated integers',
  'The first duplicate integer or -1',
  '{"input": "5\n2 1 3 1 4", "output": "1"}',
  '[{"stdin":"5\n2 1 3 1 4","expectedOutput":"1"},{"stdin":"4\n1 2 3 4","expectedOutput":"-1"},{"stdin":"3\n5 5 5","expectedOutput":"5"},{"stdin":"6\n1 2 3 4 2 5","expectedOutput":"2"},{"stdin":"1\n7","expectedOutput":"-1"}]'
),

('TypeScript', 'Silver', 74,
  'Missing Number Finder',
  'Given N-1 distinct integers from 1 to N (with exactly one missing), find and print the missing number.',
  'Line 1: integer N\nLine 2: N-1 space-separated integers',
  'The missing number',
  '{"input": "5\n1 2 4 5", "output": "3"}',
  '[{"stdin":"5\n1 2 4 5","expectedOutput":"3"},{"stdin":"3\n1 3","expectedOutput":"2"},{"stdin":"4\n2 3 4","expectedOutput":"1"},{"stdin":"6\n1 2 3 4 6","expectedOutput":"5"},{"stdin":"5\n2 3 4 5","expectedOutput":"1"}]'
),

('TypeScript', 'Gold', 74,
  'Longest Common Prefix',
  'Given N words, find and print the longest common prefix. If none, print "".',
  'Line 1: integer N\nNext N lines: one word each',
  'The longest common prefix (may be empty string)',
  '{"input": "3\nflower\nflow\nflight", "output": "fl"}',
  '[{"stdin":"3\nflower\nflow\nflight","expectedOutput":"fl"},{"stdin":"3\ndog\nracecar\ncar","expectedOutput":""},{"stdin":"2\ninterspecies\ninterstellar","expectedOutput":"inters"},{"stdin":"1\nhello","expectedOutput":"hello"},{"stdin":"3\nabc\nabc\nabc","expectedOutput":"abc"}]'
),

-- ══════════════════════════════════════════════
-- C#
-- ══════════════════════════════════════════════
('C#', 'Bronze', 51,
  'Count Vowels',
  'Given a lowercase string, count and print the number of vowels (a, e, i, o, u).',
  'A single lowercase string',
  'A single integer — vowel count',
  '{"input": "hello", "output": "2"}',
  '[{"stdin":"hello","expectedOutput":"2"},{"stdin":"aeiou","expectedOutput":"5"},{"stdin":"xyz","expectedOutput":"0"},{"stdin":"programming","expectedOutput":"3"},{"stdin":"a","expectedOutput":"1"}]'
),

('C#', 'Silver', 51,
  'Word Count',
  'Given a sentence, count and print the number of words (words are separated by single spaces).',
  'A single line of text',
  'A single integer — the number of words',
  '{"input": "hello world", "output": "2"}',
  '[{"stdin":"hello world","expectedOutput":"2"},{"stdin":"the quick brown fox","expectedOutput":"4"},{"stdin":"one","expectedOutput":"1"},{"stdin":"a b c d e","expectedOutput":"5"},{"stdin":"I love programming","expectedOutput":"3"}]'
),

('C#', 'Gold', 51,
  'Armstrong Number',
  'Given an integer N, print "true" if it is an Armstrong number (sum of its digits each raised to the power of digit count equals N), else "false".',
  'A single integer N',
  '"true" or "false"',
  '{"input": "153", "output": "true"}',
  '[{"stdin":"153","expectedOutput":"true"},{"stdin":"370","expectedOutput":"true"},{"stdin":"123","expectedOutput":"false"},{"stdin":"1","expectedOutput":"true"},{"stdin":"9474","expectedOutput":"true"}]'
),

-- ══════════════════════════════════════════════
-- Swift
-- ══════════════════════════════════════════════
('Swift', 'Bronze', 83,
  'Sum of Digits',
  'Given a non-negative integer N, compute and print the sum of its digits.',
  'A single non-negative integer N',
  'A single integer — digit sum',
  '{"input": "123", "output": "6"}',
  '[{"stdin":"123","expectedOutput":"6"},{"stdin":"0","expectedOutput":"0"},{"stdin":"9","expectedOutput":"9"},{"stdin":"9999","expectedOutput":"36"},{"stdin":"100","expectedOutput":"1"}]'
),

('Swift', 'Silver', 83,
  'Second Largest Element',
  'Given an array of N integers, find and print the second largest distinct value. If all elements are the same, print that value.',
  'Line 1: integer N\nLine 2: N space-separated integers',
  'The second largest value',
  '{"input": "5\n1 2 3 4 5", "output": "4"}',
  '[{"stdin":"5\n1 2 3 4 5","expectedOutput":"4"},{"stdin":"4\n10 20 20 30","expectedOutput":"20"},{"stdin":"3\n5 5 5","expectedOutput":"5"},{"stdin":"2\n1 2","expectedOutput":"1"},{"stdin":"6\n3 1 4 1 5 9","expectedOutput":"5"}]'
),

('Swift', 'Gold', 83,
  'Balanced Parentheses',
  'Given a string of parentheses, print "true" if it is balanced, "false" otherwise.',
  'A single string containing only ( and )',
  '"true" or "false"',
  '{"input": "(())", "output": "true"}',
  '[{"stdin":"(())","expectedOutput":"true"},{"stdin":"()()","expectedOutput":"true"},{"stdin":"(()","expectedOutput":"false"},{"stdin":")(","expectedOutput":"false"},{"stdin":"((()))","expectedOutput":"true"}]'
),

-- ══════════════════════════════════════════════
-- Kotlin
-- ══════════════════════════════════════════════
('Kotlin', 'Bronze', 78,
  'Count Evens and Odds',
  'Given N integers, print the count of even numbers on line 1 and count of odd numbers on line 2.',
  'Line 1: integer N\nLine 2: N space-separated integers',
  'Line 1: even count\nLine 2: odd count',
  '{"input": "5\n1 2 3 4 5", "output": "2\n3"}',
  '[{"stdin":"5\n1 2 3 4 5","expectedOutput":"2\n3"},{"stdin":"4\n2 4 6 8","expectedOutput":"4\n0"},{"stdin":"3\n1 3 5","expectedOutput":"0\n3"},{"stdin":"1\n0","expectedOutput":"1\n0"},{"stdin":"6\n10 11 12 13 14 15","expectedOutput":"3\n3"}]'
),

('Kotlin', 'Silver', 78,
  'String Palindrome Check',
  'Given a string, check if it is a palindrome. Print "true" or "false".',
  'A single string (lowercase, no spaces)',
  '"true" or "false"',
  '{"input": "racecar", "output": "true"}',
  '[{"stdin":"racecar","expectedOutput":"true"},{"stdin":"hello","expectedOutput":"false"},{"stdin":"madam","expectedOutput":"true"},{"stdin":"abc","expectedOutput":"false"},{"stdin":"level","expectedOutput":"true"}]'
),

('Kotlin', 'Gold', 78,
  'FizzBuzz Extended',
  'Print numbers from 1 to N. For multiples of 3 print "Fizz", of 5 print "Buzz", of 7 print "Whiz", of 3 and 5 print "FizzBuzz", of 3 and 7 print "FizzWhiz", of 5 and 7 print "BuzzWhiz", of all three print "FizzBuzzWhiz".',
  'A single integer N',
  'N lines of extended FizzBuzz output',
  '{"input": "7", "output": "1\n2\nFizz\n4\nBuzz\nFizz\nWhiz"}',
  '[{"stdin":"7","expectedOutput":"1\n2\nFizz\n4\nBuzz\nFizz\nWhiz"},{"stdin":"1","expectedOutput":"1"},{"stdin":"15","expectedOutput":"1\n2\nFizz\n4\nBuzz\nFizz\nWhiz\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz"},{"stdin":"3","expectedOutput":"1\n2\nFizz"},{"stdin":"21","expectedOutput":"1\n2\nFizz\n4\nBuzz\nFizz\nWhiz\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n16\n17\nFizz\n19\nBuzz\nFizzWhiz"}]'
);
