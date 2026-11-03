# Fonts

`BricolageGrotesque-Title.ttf` is Bricolage Grotesque ExtraBold fixed at optical size 96 and 84% width, the native app's match for the web `title-*` styles (`--font-width-title-lg`). React Native can't set variable-font axes, so this is a static instance cut from the Google Fonts variable file with fontTools:

```
python3 -c "from fontTools.ttLib import TTFont; from fontTools.varLib import instancer; f = instancer.instantiateVariableFont(TTFont('BricolageGrotesque[opsz,wdth,wght].ttf'), {'opsz': 96, 'wght': 800, 'wdth': 84}); f.save('BricolageGrotesque-Title.ttf')"
```

The name table is then set to the family "Bricolage Grotesque Title". If the title width token changes, cut a new instance at the new width.

Licensed under the SIL Open Font License 1.1 (`OFL.txt`).
