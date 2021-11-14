# [Ecency vision][ecency_vision] – Ecency Web/Desktop client

![ecency](https://ecency.com/assets/github-cover.png)

Immutable, decentralized, uncensored, rewarding communities powered by Hive.

Fast, simple and clean source code with Reactjs + Typescript.

## Website

- [Production version][ecency_vision] - master branch
- [Alpha version][ecency_alpha] - development branch

## Ecency has a similar Desktop app (but is not Hive Engine aware!)

Please check latest version on [Release page][ecency_release] or [Ecency link][ecency_desktop].

- Mac users: `Ecency-3.x.x.dmg`
- Windows users: `Ecency.Setup.3.x.x.exe`
- Linux users: `ecency-surfer_3.x.x_amd_64.deb`, `Ecency-3.x.x.AppImage`, `ecency-surfer-3.x.x.x86_64.rpm`, `ecency-surfer-3.x.x.tar.gz`

## Developers

Feel free to test it out and submit improvements and pull requests.  
Please run pre-commit-hook.sh before committing

### Build instructions

##### Requirements

- node ^12.0.0
- yarn

##### Clone

`$ git clone https://github.com/ecency/ecency-vision`

`$ cd ecency-vision`

##### Install dependencies

`$ yarn`

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

`$ yarn start`

For website development Change `HIVE_SIGNER_APP` in `src/client_config.ts` to an account that you control. This account must have it's APP_SECRET with Hive Signer. This environment variable `HIVESIGNER_CLIENT_SECRET` must be set to this secret. Additionally, @hivesigner must be given posting authority for said account. If that HIVE_SIGNER_APP happens to be 'ecency.app', then you'll need the APP_SECRET that corresponds to that app.

##### Start desktop in dev

`$ cd src/desktop`
`$ yarn`
`$ yarn dev`

For _desktop_ development you should set the `HIVE_SIGNER_APP` to `'ecency.app'` if you wish that it uses Hive,
and Ecency points.

##### Pushing new code / Pull requests

- Make sure to branch off your changes from `development` branch.
- Make sure to run `yarn test` and add tests to your changes.
- Code on!

## Docker

You can use official `ecency/vision:latest` image to run Vision locally, deploy it to staging or even production environment. The simplest way is to run it with following command:

```bash
docker run -it --rm -p 3000:3000 ecency/vision:latest
```

Configure the instance using following environment variables:

- `USE_PRIVATE`

```bash
docker run -it --rm -p 3000:3000 -e USE_PRIVATE=1 ecency/vision:latest
```

### Swarm

You can easily deploy a set of vision instances to your production environment, using example `docker-compose.yml` file. Docker Swarm will automatically keep it alive and load balance incoming traffic between the containers:

```bash
docker stack deploy -c docker-compose.yml -c docker-compose.production.yml vision
```

## Issues

To report a non-critical issue, please file an issue on this GitHub project.

If you find a security issue please report details to: security@ecency.com

We will evaluate the risk and make a patch available before filing the issue.

[//]: # "LINKS"
[ecency_vision]: https://ecency.com
[ecency_desktop]: https://desktop.ecency.com
[ecency_alpha]: https://alpha.ecency.com
[ecency_release]: https://github.com/ecency/ecency-vision/releases
