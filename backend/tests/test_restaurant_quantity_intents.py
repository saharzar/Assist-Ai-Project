import pytest
from app.core.config import Settings
from app.services.restaurant_llm_service import RestaurantLLMService, _intent_allowed
from app.services.restaurant_tools import CATALOG, OrderSnapshot, OrderLine, RestaurantSnapshot

class NoProvider:
    def respond(self, *_):
        raise AssertionError('Quantity requests must not fall through to food ordering')

def state(item='appleJuice', quantity=4, step='menu'):
    lines=[OrderLine(item_id='pizza', quantity=1)] if item != 'pizza' else []
    if quantity: lines.append(OrderLine(item_id=item, quantity=quantity))
    categories={key:None for key in ('mains','salads','soups','desserts','drinks')}
    for line in lines: categories[CATALOG[line.item_id]['category']]=line.item_id
    return RestaurantSnapshot(step=step, category='mains', unavailable='pasta', order=OrderSnapshot(**categories,lines=lines))

def ask(message, current, language='en', history=None):
    return RestaurantLLMService(Settings(),provider=NoProvider()).chat_with_tools(message,language,history or [],current)

@pytest.mark.parametrize('item,current,message,expected,action',[
 ('appleJuice',4,'I would like to reduce 1 apple juice.',3,'SET_QUANTITY'),
 ('appleJuice',1,'I would like to remove apple juice.',0,'REMOVE_ITEM'),
 ('chicken',2,'I want to reduce grilled chicken.',1,'SET_QUANTITY'),
 ('chicken',1,'I want to reduce grilled chicken.',0,'SET_QUANTITY'),
 ('burger',5,'Remove one beef burger.',4,'SET_QUANTITY'),
 ('burger',5,'Remove beef burger.',0,'REMOVE_ITEM'),
 ('pizza',5,'I only want two pizzas.',2,'SET_QUANTITY'),
 ('pizza',5,'Reduce pizza by two.',3,'SET_QUANTITY'),
 ('appleJuice',0,'Remove apple juice.',0,None),
 ('appleJuice',4,"I changed my mind about the apple juice.",0,'REMOVE_ITEM'),
 ('appleJuice',4,"I don't want apple juice anymore.",0,'REMOVE_ITEM'),
 ('appleJuice',4,'Take one apple juice off my order.',3,'SET_QUANTITY'),
])
def test_exact_regressions(item,current,message,expected,action):
    outcome=ask(message,state(item,current))
    assert outcome.state.order.quantity(item)==expected
    assert not any(a.type=='SELECT_ITEM' for a in outcome.actions)
    assert 'added' not in outcome.reply.lower()
    if action: assert any(a.type==action for a in outcome.actions)
    else: assert outcome.actions==[]

@pytest.mark.parametrize('language,reduce,remove,set_to',[
 ('en','Remove one apple juice.','Remove apple juice.','I only want two apple juices.'),
 ('fr','Retirez un jus de pomme.','Je ne veux plus de jus de pomme.',"Je n'en veux que deux."),
 ('de','Entfernen Sie einen Apfelsaft.','Ich möchte den Apfelsaft nicht mehr.','Ich möchte nur zwei.'),
 ('es','Quita un zumo de manzana.','Ya no quiero el zumo de manzana.','Solo quiero dos.'),
 ('pt','Retire um sumo de maçã.','Já não quero o sumo de maçã.','Quero apenas dois.'),
 ('tr','Bir elma suyunu çıkar.','Elma suyunu artık istemiyorum.','Sadece iki tane istiyorum.'),
])
def test_six_languages(language,reduce,remove,set_to):
    current=state(step='review')
    history=[{'role':'user','content':CATALOG['appleJuice']['names'][language]}]
    for message,quantity in [(reduce,3),(remove,0),(set_to,2)]:
        outcome=ask(message,current,language,history)
        assert outcome.state.order.quantity('appleJuice')==quantity,(message,outcome.reply)
        assert outcome.state.step=='review'
        assert not any(a.type=='SELECT_ITEM' for a in outcome.actions)

def test_contextual_sequence_and_bounds():
    current=state()
    for phrase,quantity in [('Actually remove one.',3),('Remove another one.',2),('I only want one.',1),('Actually, remove the apple juice.',0)]:
        outcome=ask(phrase,current,history=[{'role':'user','content':'Add four apple juices.'}])
        assert outcome.state.order.quantity('appleJuice')==quantity
        current=outcome.state
    denied=ask('Remove five apple juices.',state())
    assert denied.actions==[]
    assert denied.state.order.quantity('appleJuice')==4
    assert 'only' in denied.reply


def test_ambiguous_decrease_preserves_operation():
    outcome=ask('I want to reduce some things.',state())
    assert outcome.actions==[]
    assert outcome.pending.action=='decrease_quantity'
    resolved=RestaurantLLMService(Settings(),provider=NoProvider()).chat_with_tools('Apple juice','en',[],outcome.state,outcome.pending)
    assert resolved.state.order.quantity('appleJuice')==3


def test_model_cannot_convert_negative_intent_to_add():
    assert not _intent_allowed('I would like to reduce apple juice.',[],'en','add_order_item',{'item_id':'appleJuice','quantity':1},state())

@pytest.mark.parametrize('language,message',[
 ('en','Reduce the quantity.'),('en','One less apple juice.'),
 ('fr','Réduisez la quantité de jus de pomme.'),('fr','Je veux un jus de pomme en moins.'),
 ('de','Reduzieren Sie die Menge.'),('de','Ich möchte einen weniger.'),
 ('es','Reduce la cantidad.'),('pt','Reduza a quantidade.'),('pt','Quero um a menos.'),
 ('tr','Bir elma suyu azalt.'),('tr','Bir tane daha az istiyorum.'),
])
def test_semantic_reduction_variants(language,message):
    outcome=ask(message,state(),language,[{'role':'user','content':CATALOG['appleJuice']['names'][language]}])
    assert outcome.state.order.quantity('appleJuice')==3,(message,outcome.reply)
    assert any(a.type=='SET_QUANTITY' for a in outcome.actions)


def test_unknown_removal_does_not_borrow_a_prior_item():
    outcome=ask('Remove one unicorn soup.',state(),history=[{'role':'user','content':'Add apple juice.'}])
    assert outcome.actions==[]
    assert outcome.state.order.quantity('appleJuice')==4


def test_replacement_is_not_reclassified_as_addition():
    outcome=ask('Replace apple juice with orange juice.',state())
    assert outcome.state.order.quantity('appleJuice')==0
    assert outcome.state.order.quantity('orangeJuice')==1


def test_excess_decrease_clarification_keeps_delta_semantics():
    denied=ask('Remove ten apple juices.',state())
    assert denied.actions==[]
    resolved=RestaurantLLMService(Settings(),provider=NoProvider()).chat_with_tools('two','en',[],denied.state,denied.pending)
    assert resolved.state.order.quantity('appleJuice')==2


def test_increase_and_review_replacement_use_real_cart():
    increased=ask('Increase apple juice by two.',state(step='review'))
    assert increased.state.step=='review'
    assert increased.state.order.quantity('appleJuice')==6
    assert '6 Apple juices' in increased.reply
    replaced=ask('Replace apple juice with orange juice.',state(step='review'))
    assert replaced.state.step=='review'
    assert replaced.state.order.quantity('appleJuice')==0
    assert replaced.state.order.quantity('orangeJuice')==1


@pytest.mark.parametrize('language,message,target',[
 ('en','Reduce by one.',3),('en','Change it to two.',2),
 ('fr','Mettez-en deux.',2),('fr',"J'ai changé d'avis.",0),
 ('de','Machen Sie daraus zwei.',2),('de','Ich habe meine Meinung geändert.',0),
 ('es','Déjalo en dos.',2),('es','He cambiado de opinión.',0),
 ('pt','Deixe em dois.',2),('pt','Mudei de ideia.',0),
 ('tr','Sayıyı ikiye düşür.',2),('tr','Fikrimi değiştirdim.',0),
])
def test_generic_followups_use_recent_item(language,message,target):
    outcome=ask(message,state(),language,[{'role':'user','content':CATALOG['appleJuice']['names'][language]}])
    assert outcome.state.order.quantity('appleJuice')==target,(message,outcome.reply)
    assert not any(a.type=='SELECT_ITEM' for a in outcome.actions)
