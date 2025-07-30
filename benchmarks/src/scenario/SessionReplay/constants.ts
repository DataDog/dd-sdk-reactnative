export enum Dog {
  LabradorRetriever = "Labrador Retriever",
  GermanShepherd = "German Shepherd",
  GoldenRetriever = "Golden Retriever",
  Bulldog = "Bulldog",
  Poodle = "Poodle",
  Beagle = "Beagle",
  Rottweiler = "Rottweiler",
  Dachshund = "Dachshund",
  SiberianHusky = "Siberian Husky",
  Boxer = "Boxer",
  GreatDane = "Great Dane",
  DobermanPinscher = "Doberman Pinscher",
  CockerSpaniel = "Cocker Spaniel",
  BorderCollie = "Border Collie",
  ShihTzu = "Shih Tzu",
  Chihuahua = "Chihuahua",
  AustralianShepherd = "Australian Shepherd",
  BassetHound = "Basset Hound",
  CavalierKingCharlesSpaniel = "Cavalier King Charles Spaniel",
  Mastiff = "Mastiff"
}

export const TEST_DOGS = Object.entries(Dog).map(([_key, value]) => ({
  label: value,
  value,
}));
