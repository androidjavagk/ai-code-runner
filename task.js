let array1 = [1, 2, 3];
let array2 = [4, 5, 6];

function sumArrays(arr1, arr2) {
  let sum = 0;
  
  for (let i = 0; i < arr1.length; i++) {
    sum += arr1[i] + arr2[i];
  }
  
  return sum;
}

let result = sumArrays(array1, array2);
console.log(result); // Output will be 21 (1+4, 2+5, 3+6)
