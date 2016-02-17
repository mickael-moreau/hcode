wget http://nodejs.org/dist/node-v0.4.4.tar.gz
tar -xzf node-v0.4.4.tar.gz
cd node-v0.4.4
./configure
# may be : apt-get -y install build-essential
sudo make install
node # you should have a shell interface ready, type : console.log('hello');
npm install webworker-threads # need to run our code
npm install -g js-yaml # need to run our code
# sudo npm install -g webworker-threads # same as below, but global if you prefer global install of the module
chmod 744 ./src/nodejs/launch.sh

# atom package useful (but I get config error for now) : https://atom.io/packages/node-debugger

# npm debuger
npm install -g node-inspector

# use npm debuger :
DEBUG=true ./src/nodejs/launch.sh $PWD/input/sujet/subject_example.in $PWD/output/sujet/subjetc_example.in

# or use npm package.json
npm install js-yaml --save # save in all dependencies
npm install node-inspector --save-dev # save in dev dependencies
npm install mkdirp --save

=> then you only have to do npm install at root folder to install all
