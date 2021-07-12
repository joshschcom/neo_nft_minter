import React from 'react';
import {Navbar, Image} from 'react-bootstrap';
import Button from 'react-bootstrap-button-loader';
const Neon = require("@cityofzion/neon-js");

const CONTRACT_HASH = 'c5f34c152b21381632c90111fb72ee8b9680ee79';
const nodeURL = "http://localhost:50012";

class App extends React.Component {
    state = {
        ownedTokens: [],
        toAccount: '',
        loadingMint: false,
        name: '',
        description: '',
        image: '',
        privateKey: window.localStorage.getItem('key') || '',
        mintedNFT: ''
    };

    updateToAccount(value) {
        this.setState({toAccount: value});
    }

    updateName(value) {
        this.setState({name: value});
    }

    updateDescription(value) {
        this.setState({description: value});
    }

    updateImage(value) {
        this.setState({image: value});
    }

    updatePrivateKey(value) {
        this.setState({privateKey: value});
        if(value.length === 64){
            this.getOwnedNFTs(value);
            window.localStorage.setItem('key', value);
        }
    }

    async mintNFT(){
        this.setState({loadingMint: true});
        const rpcClient = new Neon.rpc.RPCClient(nodeURL);
        const sender = new Neon.wallet.Account(
            this.state.privateKey
        );
        console.log(sender);
        const receiver = new Neon.wallet.Account(
            this.state.toAccount
        );
        const script = Neon.sc.createScript({
            scriptHash: CONTRACT_HASH,
            operation: "mint",
            args: [
                Neon.sc.ContractParam.hash160(receiver.address),
                this.state.name,
                this.state.description,
                this.state.image
            ],
        });
        const currentHeight = await rpcClient.getBlockCount();
        const tx = new Neon.tx.Transaction({
            sender: sender.scriptHash,
            signers: [
                {
                    account: sender.scriptHash,
                    scopes: Neon.tx.WitnessScope.CalledByEntry,
                },
            ],
            validUntilBlock: currentHeight + 50,
            systemFee: 0,
            script: script,
        });
        const feePerByteInvokeResponse = await rpcClient.invokeFunction(
            Neon.CONST.NATIVE_CONTRACT_HASH.PolicyContract,
            "getFeePerByte"
        );
        const feePerByte = Neon.u.BigInteger.fromNumber(feePerByteInvokeResponse.stack[0].value);
        // Account for witness size
        const transactionByteSize = tx.serialize().length / 2 + 109;
        // Hardcoded. Running a witness is always the same cost for the basic account.
        const witnessProcessingFee = Neon.u.BigInteger.fromNumber(1000390);
        const networkFeeEstimate = feePerByte
            .mul(transactionByteSize)
            .add(witnessProcessingFee);
        tx.networkFee = networkFeeEstimate;
        const invokeFunctionResponse = await rpcClient.invokeScript(Neon.u.HexString.fromHex(tx.script), [
            {
                account: sender.scriptHash,
                scopes: Neon.tx.WitnessScope.CalledByEntry,
            },
        ]);
        const requiredSystemFee = Neon.u.BigInteger.fromNumber(
            invokeFunctionResponse.gasconsumed
        );
        tx.systemFee = requiredSystemFee;
        const signedTransaction = tx.sign(
            sender,
            1234567890
        );
        console.log(tx.toJson());
        try {
            const result = await rpcClient.sendRawTransaction(
               Neon.u.HexString.fromHex(signedTransaction.serialize(true))
            );
            console.log(result);
        } catch(e){
            console.log(e);
        }
        await new Promise(resolve => setTimeout(resolve, 10000));
        await this.getOwnedNFTs(this.state.privateKey);
        this.setState({mintedNFT: this.state.image});
        this.setState({loadingMint: false});
    }

    render() {
        return (
            <div>
                <Navbar className="navbar-custom" variant="dark">
                    <div style={{width: "90%"}}>
                        <Navbar.Brand href="/">
                            <b>Neo NFT Minter</b>
                        </Navbar.Brand>
                    </div>
                </Navbar>
                <div style={{margin: "20px"}}>
                    <div>
                        <input className="form-control" type="password" placeholder="Enter private key"
                               value={this.state.privateKey}
                               onChange={e => this.updatePrivateKey(e.target.value)}
                               style={{marginBottom: "10px"}}/>
                       <br/>
                        <div style={{fontWeight: "900", fontFamily: "Helvetica"}}>
                            <p>Mint NFT</p>
                        </div>
                        <input className="form-control" type="text" placeholder="Enter NFT receiver address"
                               value={this.state.toAccount}
                               onChange={e => this.updateToAccount(e.target.value)}
                               style={{marginBottom: "10px"}}/>
                        <input className="form-control" type="text" placeholder="Enter NFT name"
                               value={this.state.name}
                               onChange={e => this.updateName(e.target.value)}
                               style={{marginBottom: "10px"}}/>
                        <input className="form-control" type="text" placeholder="Enter NFT description"
                               value={this.state.description}
                               onChange={e => this.updateDescription(e.target.value)}
                               style={{marginBottom: "10px"}}/>
                        <input className="form-control" type="text" placeholder="Enter NFT image url"
                               value={this.state.image}
                               onChange={e => this.updateImage(e.target.value)}
                               style={{marginBottom: "10px"}}/>
                        <Button variant="success btn" onClick={this.mintNFT.bind(this)} loading={this.state.loadingMint}>Mint NFT</Button>
                        <br/>
                        {this.state.mintedNFT &&
                        <Image src={this.state.mintedNFT}
                               style={{height: "300px", width: "300px", marginTop: "10px"}} fluid/>
                        }
                        <br/>
                        {this.state.ownedTokens.length > 0 &&
                        <div style={{fontWeight: "900", fontFamily: "Helvetica"}}>
                            <p>Your collections</p>
                        </div>
                        }
                        <div>
                            {this.state.ownedTokens.map((n) => (

                                    <div key={n.token_id} style={{
                                        border: "1px solid #1e1e1e", padding: "20px", borderRadius: "15px",
                                    }}>
                                        <div>
                                            <p><b>Name: </b>{n.name}</p>
                                            <p><b>Description: </b>{n.description}</p>
                                            <Image src={n.image}
                                                   style={{height: "300px", width: "300px", marginTop: "10px"}} fluid/>
                                            <p><b>Token Id: </b>{n.token_id}</p>
                                            <p><b>Contract Address: </b>{"0x" + CONTRACT_HASH}</p>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )

    }

    async getOwnedNFTs(privateKey){
        if(!privateKey || privateKey.length !== 64){
            return
        }
        const sender = new Neon.wallet.Account(
            privateKey
        );
        console.log(sender);
        const rpcClient = new Neon.rpc.RPCClient(nodeURL);
        let script = Neon.sc.createScript({
            scriptHash: CONTRACT_HASH,
            operation: "tokensOf",
            args: [
                Neon.sc.ContractParam.hash160(sender.address)
            ],
        });
        let res = await rpcClient.invokeScript(Neon.u.HexString.fromHex(script));
        console.log(res);
        let ownedTokens = [];
        let tokenIds = [];
        let iterator = res.stack[0].iterator;
        iterator.map(function(token, i){
            tokenIds.push(Neon.u.HexString.fromBase64(token.value[1].value).toNumber());
        });
        console.log(tokenIds);
        for(let i=0; i < tokenIds.length; i++){
            let tokenId = tokenIds[i];
            script = Neon.sc.createScript({
                scriptHash: CONTRACT_HASH,
                operation: "getToken",
                args: [
                    tokenId
                ],
            });
            res = await rpcClient.invokeScript(Neon.u.HexString.fromHex(script));
            let name = Neon.u.HexString.fromBase64(res.stack[0].value[0].value).toAscii();
            let description = Neon.u.HexString.fromBase64(res.stack[0].value[1].value).toAscii();
            let image = Neon.u.HexString.fromBase64(res.stack[0].value[2].value).toAscii();
            ownedTokens.push({
                "name": name,
                "description": description,
                "image": image,
                "token_id": tokenId
            });
        }
        console.log(ownedTokens);
        this.setState({ownedTokens: ownedTokens})

    }

    async componentWillMount() {
        await this.getOwnedNFTs(this.state.privateKey);
    }
}

export default App
