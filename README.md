# hcode

# 1 BASIC-----------------------------------------------------------------------

- sujet : https://drive.google.com/file/d/0Bz65c6SucTWATW9ZSmNBU1RZelU/view?usp=sharing
- hash judge : https://hashcodejudge.withgoogle.com/
- test online : https://jsfiddle.net/nzaero/ys2cd7we/#&togetherjs=eBgwjtUs8w

# 2 UNIX dependency (pas obligatoire)

- Pour reccuperer ma conf : 
https://github.com/regnou/ALIAS/

- paoloantinori/hhighlighter: https://github.com/paoloantinori/hhighlighter#screenshots
curl http://beyondgrep.com/ack-2.08-single-file > ~/bin/ack && chmod 0755 !#:3
https://github.com/regnou/ALIAS/blob/master/bin/_h.sh

# 3 JAVA SECTION

- le code est dans le repertoire java (classe App.java est le point d'entree MAIN)

- HOW TO GENERATE THE ARCHETYPE USED :  https://github.com/akiraly/reusable-poms

- COMPILE sans test
alias   c='mvn clean install -U -Dgpg.skip=true    -DskipTests  2>&1        |  h -i $MVN_ALL'

- COMPILE avec test
alias  ct='mvn clean install -U -Dgpg.skip=true                 2>/dev/null    | grep -v "DATABASECHANGELOG|executed|changeset|expected\ postgresql,\ got\ h2|Successfully\ released\ change\ log\ lock|Successfully\ acquired\ change\ log\ lock"   |  h -i $MVN_ALL'

JAVA doc
// read file ; https://eyalgo.com/2015/01/06/java-8-stream-and-lambda-expressions-parsing-file-example/

hello
hello
