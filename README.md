# [Ecency vision][ecency_vision] – Ecency Web/Desktop client

![ecency](https://ecency.com/assets/github-cover.png)

Immutable, decentralized, uncensored, rewarding communities powered by Hive.

Fast, simple and clean source code with Reactjs + Typescript.

## Developers

Feel free to test it out and submit improvements and pull requests.  
Please run pre-commit-hook.sh before committing

### Build instructions

##### Requirements

- node ^12.0.0
- yarn
- g++ 9.3 (other versions probably work)
- boost 1.76 (other versions probably work)
- mariadb or mysql

##### Clone

`$ git clone https://github.com/steemfiles/ecency-vision`
`$ cd ecency-vision`
`$ git checkout POB-vision`

##### Install dependencies

`$ yarn`

##### Set Up Your Proxying Web Front End

In order for this to work at all, you'll need a server that can do proxy ports.  `./proxy.apache-conf` in the base
directory should give you some ideas.  There is another server that can do it, but I can't remember how to spell 
the thing. :)  


##### Edit backend config file or define environment variables

`$ nano src/config.ts`

##### Environment variables

- MARIADB_PASSWORD
- HIVESIGNER_CLIENT_SECRET
- SEARCH_API_SECRET
- SEARCH_API_ADDR
- `USE_PRIVATE` - if instance has private api address and auth (0 or 1 value)

###### MARIADB_PASSWORD

Set MARIADB_PASSWORD to some random password. Open mariadb or mysql and create a user for the database with the name
as indicated below
`create user 'webuser'@'localhost' identified by '*password*';`

Create a database called "enginecy" as below:

```
create database enginecy;
connect enginecy
grant select,insert on enginecy to "webuser"@"localhost"
create user 'webadmin'@'localhost' identified by '*password*
create or replace table promotions ( blockNumber int not null, tx char(64) not null primary key, author varchar(16), permlink varchar(256) not null, start datetime not null, end datetime not null, data json );

grant insert,select on promotions to 'webuser'@'localhost';
grant insert,select,delete,update on promotions to 'webadmin'@'localhost';

```

###### USE_PRIVATE

You should set this to '0' unless you're part of the ecency team.

###### PRIVATE_API_ADDR

Should be a full address with protocol and port

###### PRIVATE_API_AUTH

This is generated with the following steps. Take a string and
make it a JSON object.
Example:

```
> s=JSON.stringify(0xF00);
'3840'
> (Buffer.from('3840', 'utf-8')).toString('base64')
'Mzg0MA=='
```

Now 'Mzg0MA==' should work. The object passed in should be a long hexadecimal number.

###### SEARCH_API_ADDR and SEARCH_API_SECRET

You need to sign up at HiveSearcher and get a secret there. The Hive Searcher URL is https://api.hivesearcher.com/.

###### HIVE_SIGNER_CLIENT_SECRET

You need to sign up with a Hive account at [Hive Signer](https://hivesigner.com/developers).
You'll get an APP_SECRET there for that account and you'll
need to add the account name to the common config file.

##### Create Common Config File

`$ cp src/client_config_default.js src/client_config.ts`
`$ nano src/client_config.ts`

###### HIVE_SIGNER_APP

As the corresponding constant to HIVE_SIGNER_CLIENT_SECRET,
this should be set to the account username you have at Hive Signer. Do not use the '@' sign in the username.

###### Edit src/common/constants/site.json

cp defaults.json site.json
Edit the parameters of site.json

###### TEST_NET

Set this value to be true if you wish to use the testnet for Hive for testing. You will have to use the browser with CORS turned off because
the nodes for testnet do not properly give allow any CORS header. This can be done in the following way:

```
chromium --disable-web-security --disable-gpu --user-data-dir=$HOME/userTmp http://localhost:3000
```

##### Start website in dev

In testing your need a reverse-proxy server to receive on port 80 and then proxy for ports 2997-3000 as described
in the configuration file.

`$ make`
`$ node private-api/build/private-api-server.js &`
`$ node private-api/build/relayserver.js & node private-api/build/promoter.js &`
`$ yarn start`

For website development Change `HIVE_SIGNER_APP` in `src/client_config.ts` to an account that you control. This account
must have it's APP_SECRET with Hive Signer. This environment variable `HIVESIGNER_CLIENT_SECRET` must be set to this
secret. Additionally, @hivesigner must be given posting authority for said account. If that HIVE_SIGNER_APP happens to
be 'ecency.app', then you'll need the APP_SECRET that corresponds to that app.

You'll be able to view it at port 80.


##### Start desktop in dev

This is not being maintained.

`$ cd src/desktop`
`$ yarn`
`$ yarn dev`

For _desktop_ development you should set the `HIVE_SIGNER_APP` to `'ecency.app'` if you wish that it uses Hive,
and Ecency points.

##### Pushing new code / Pull requests

- Make sure to branch off your changes from `POB-vision` branch.
- Make sure to run `yarn test` and add tests to your changes.
- Code on!

## Issues

To report a non-critical issue, please file an issue on this GitHub project.

If you find a security issue please report details to: leprechaun 6010 on Discord

We will evaluate the risk and make a patch available before filing the issue.

[//]: # "LINKS"
Main site using software: https://proofofbrain.blog
GitHub Repo: https://github.com/steemfiles/ecency-vision
