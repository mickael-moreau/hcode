wget http://nodejs.org/dist/node-v0.4.4.tar.gz
tar -xzf node-v0.4.4.tar.gz
cd node-v0.4.4
./configure
# may be : apt-get -y install build-essential
sudo make install
node # you should have a shell interface ready, type : console.log('hello');
npm install webworker-threads # need to run our code
# sudo npm install -g webworker-threads # same as below, but global if you prefer global install of the module
chmod 744 ./src/nodejs/launch.sh

# atom package useful (but I get config error for now) : https://atom.io/packages/node-debugger
npm install -g node-inspector
