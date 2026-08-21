-- Board themes use the same canonical HEX values as the reward color catalog.
UPDATE boards SET color = '#4F8FD8' WHERE UPPER(color) = '#3878D8';
UPDATE boards SET color = '#2F8C83' WHERE UPPER(color) = '#397D73';
UPDATE boards SET color = '#D96F62' WHERE UPPER(color) = '#B56D50';
UPDATE boards SET color = '#C85F7A' WHERE UPPER(color) = '#A55B76';
UPDATE boards SET color = '#5666A5' WHERE UPPER(color) = '#507F39';
