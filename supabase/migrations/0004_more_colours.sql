-- Day 3: five more crew colours, to match the clay crew art.
alter type monogram_colour add value if not exists 'sky';
alter type monogram_colour add value if not exists 'coral';
alter type monogram_colour add value if not exists 'rose';
alter type monogram_colour add value if not exists 'aqua';
alter type monogram_colour add value if not exists 'ivory';
