from typing import Any, Union, List

from boa3.builtin import NeoMetadata, metadata, public
from boa3.builtin.contract import abort
from boa3.builtin.interop.blockchain import get_contract
from boa3.builtin.interop.contract import GAS, NEO, call_contract
from boa3.builtin.interop.runtime import calling_script_hash, check_witness
from boa3.builtin.interop.storage import delete, get, put, find
from boa3.builtin.type import UInt160
from boa3.builtin.interop.iterator import Iterator


# -------------------------------------------
# METADATA
# -------------------------------------------

@metadata
def manifest_metadata() -> NeoMetadata:
    """
    Defines this smart contract's metadata information
    """
    meta = NeoMetadata()
    meta.author = "NFT"
    meta.description = "NFT"
    meta.email = "test@test.com"
    return meta


# -------------------------------------------
# TOKEN SETTINGS
# -------------------------------------------


# Script hash of the contract owner
OWNER = UInt160()
SUPPLY_KEY = 'totalSupply'

# Symbol of the Token
TOKEN_SYMBOL = 'NFT'

# Number of decimal places
TOKEN_DECIMALS = 0

# Total Supply of tokens in the system
TOKEN_TOTAL_SUPPLY = 0

TOKEN_OWNERSHIP_PREFIX = 'tokenOwner'
TOKEN_NAME_PREFIX = 'tokenName'
TOKEN_DESCRIPTION_PREFIX = 'tokenDescription'
TOKEN_IMAGE_PREFIX = 'tokenImage'
TOKEN_ADDRESS_PREFIX = 'ownedToken'


# -------------------------------------------
# Events
# -------------------------------------------


on_transfer = CreateNewEvent(
    [
        ('from_addr', Union[UInt160, None]),
        ('to_addr', Union[UInt160, None]),
        ('amount', int),
        ('token_id', bytes)
    ],
    'Transfer'
)



# -------------------------------------------
# Methods
# -------------------------------------------


@public
def symbol() -> str:
    """
    Gets the symbols of the token.

    This string must be valid ASCII, must not contain whitespace or control characters, should be limited to uppercase
    Latin alphabet (i.e. the 26 letters used in English) and should be short (3-8 characters is recommended).
    This method must always return the same value every time it is invoked.

    :return: a short string representing symbol of the token managed in this contract.
    """
    return TOKEN_SYMBOL


@public
def decimals() -> int:
    """
    Gets the amount of decimals used by the token.

    E.g. 8, means to divide the token amount by 100,000,000 (10 ^ 8) to get its user representation.
    This method must always return the same value every time it is invoked.

    :return: the number of decimals used by the token.
    """
    return TOKEN_DECIMALS


@public
def totalSupply() -> int:
    """
    Gets the total token supply deployed in the system.

    This number must not be in its user representation. E.g. if the total supply is 10,000,000 tokens, this method
    must return 10,000,000 * 10 ^ decimals.

    :return: the total token supply deployed in the system.
    """
    return get(SUPPLY_KEY).to_int()


@public
def balanceOf(account: UInt160) -> int:
    """
    Get the current balance of an address

    The parameter account must be a 20-byte address represented by a UInt160.

    :param account: the account address to retrieve the balance for
    :type account: UInt160
    """
    assert len(account) == 20
    return get(account).to_int()


@public
def tokensOf(account: UInt160) -> Iterator:
    """
    Get the tokens owned by an address

    The parameter account must be a 20-byte address represented by a UInt160.

    :param account: the account address to retrieve the balance for
    :type account: UInt160
    """
    assert len(account) == 20
    find_key = TOKEN_ADDRESS_PREFIX.to_bytes() + account.to_str().to_bytes()
    return find(find_key)


@public
def ownerOf(token_id: bytes) -> UInt160:
    """
    Get the current owner of a token

    :param token_id: the token id
    :type token_id: bytes

    :return: the token owner
    """
    ownership_key = TOKEN_OWNERSHIP_PREFIX.to_bytes() + token_id
    nft_owner = get(ownership_key)
    return UInt160(nft_owner)


@public
def getToken(token_id: bytes) -> List[bytes]:
    """
    Get the token details

    :param token_id: the token id
    :type token_id: bytes

    :return: the token details
    """
    token_name_key = TOKEN_NAME_PREFIX.to_bytes() + token_id
    token_description_key = TOKEN_DESCRIPTION_PREFIX.to_bytes() + token_id
    token_image_key = TOKEN_IMAGE_PREFIX.to_bytes() + token_id
    name = get(token_name_key)
    description = get(token_description_key)
    image = get(token_image_key)
    return [name, description, image]


@public
def transfer(from_address: UInt160, to_address: UInt160, token_id: bytes, data: Any) -> bool:
    """
    Transfers a NFT from one account to another

    If the method succeeds, it must fire the `Transfer` event and must return true, even if the from and to are the same address.

    :param from_address: the address to transfer from
    :type from_address: UInt160
    :param to_address: the address to transfer to
    :type to_address: UInt160
    :param token_id: the token id
    :type token_id: bytes
    :param data: data
    :type data: Any

    :return: whether the transfer was successful
    :raise AssertionError: raised if `from_address` or `to_address` length is not 20
    """
    # the parameters from and to should be 20-byte addresses. If not, this method should throw an exception.
    assert len(from_address) == 20 and len(to_address) == 20

    # The function MUST return false if the from account does not own the nft
    ownership_key = TOKEN_OWNERSHIP_PREFIX.to_bytes() + token_id
    nft_owner = get(ownership_key)
    if nft_owner != from_address:
        return False

    # The function should check whether the from address equals the caller contract hash.
    # If so, the transfer should be processed;
    # If not, the function should use the check_witness to verify the transfer.
    if from_address != calling_script_hash:
        if not check_witness(from_address):
            return False

    if from_address != to_address:
        from_balance = get(from_address).to_int() - 1
        to_balance = get(to_address).to_int() + 1
        put(ownership_key, to_address.to_str())
        put(from_address, from_balance)
        put(to_address, to_balance)
        from_account_token_key = TOKEN_ADDRESS_PREFIX.to_bytes() + from_address.to_str().to_bytes() + token_id
        to_account_token_key = TOKEN_ADDRESS_PREFIX.to_bytes() + to_address.to_str().to_bytes() + token_id
        delete(from_account_token_key)
        put(to_account_token_key, token_id)

    # if the method succeeds, it must fire the transfer event
    on_transfer(from_address, to_address, 1, token_id)
    return True


@public
def mint(account: UInt160, name: str, description: str, image: str):
    """
    Mints new NFT
    """
    current_total_supply = totalSupply()
    token_id = current_total_supply + 1
    token_balance = get(account).to_int()
    token_balance = token_balance + 1

    put(SUPPLY_KEY, current_total_supply + 1)
    ownership_key = TOKEN_OWNERSHIP_PREFIX.to_bytes() + token_id.to_bytes()
    put(ownership_key, account.to_str())
    token_name_key = TOKEN_NAME_PREFIX.to_bytes() + token_id.to_bytes()
    put(token_name_key, name)
    token_description_key = TOKEN_DESCRIPTION_PREFIX.to_bytes() + token_id.to_bytes()
    put(token_description_key, description)
    token_image_key = TOKEN_IMAGE_PREFIX.to_bytes() + token_id.to_bytes()
    put(token_image_key, image)
    account_token_key = TOKEN_ADDRESS_PREFIX.to_bytes() + account.to_str().to_bytes() + token_id.to_bytes()
    put(account_token_key, token_id)
    put(account, token_balance)

    on_transfer(None, account, 1, token_id.to_bytes())


@public
def verify() -> bool:
    """
    When this contract address is included in the transaction signature,
    this method will be triggered as a VerificationTrigger to verify that the signature is correct.
    For example, this method needs to be called when withdrawing token from the contract.

    :return: whether the transaction signature is correct
    """
    return check_witness(OWNER)


@public
def deploy() -> bool:
    """
    Initializes the storage when the smart contract is deployed.

    :return: whether the deploy was successful. This method must return True only during the smart contract's deploy.
    """
    if get(SUPPLY_KEY).to_int() > 0:
        return False

    put(SUPPLY_KEY, TOKEN_TOTAL_SUPPLY)
    return True
